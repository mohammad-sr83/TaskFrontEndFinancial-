"use client";

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  ChartingLibraryWidgetOptions,
  IBasicDataFeed,
  IDatafeedQuotesApi,
  ResolutionString,
  widget as TradingViewWidget,
} from "@/public/static/charting_library";
import { IOhlcvData } from "@/types/datafeed.type";
import { usePathname } from "next/navigation";
import { formatCryptoPrice } from "@/utils/formatPrice";

export interface TradingViewRef {
  addCompare: (symbol: string) => void;
}

interface Props {
  chartOptions: Partial<ChartingLibraryWidgetOptions>;
  ohlcvData: IOhlcvData[];
  className?: string;
  tokenDescription: string;
  tokenExchange: string;
  theme: "dark" | "light";
  customSymbols?: Array<{
    symbol: string;
    full_name: string;
    description: string;
  }>;
}

let intervalId: NodeJS.Timeout;

const MyTradingView = forwardRef<TradingViewRef, Props>(
  (
    {
      chartOptions,
      ohlcvData,
      theme,
      tokenDescription,
      tokenExchange,
      customSymbols = [],
    },
    ref,
  ) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chartIsReady, setChartIsReady] = useState(false);
    const widgetRef = useRef<any>(null);
    const pathname = usePathname();

    /* =====================
       EXPOSE METHODS
    ===================== */
    useImperativeHandle(ref, () => ({
      addCompare(symbol: string) {
        if (!widgetRef.current || !chartIsReady) return;

        widgetRef.current.activeChart().createStudy(
          "Compare",
          false,
          false,
          { symbol },
        );
      },
    }));

    /* =====================
       DATAFEED
    ===================== */
    const dataFeed = (
      ohlcvData: IOhlcvData[],
    ): IBasicDataFeed | (IBasicDataFeed & IDatafeedQuotesApi) => ({
      onReady: (callback) => {
        setTimeout(
          () =>
            callback({
              supported_resolutions: [
                "1S",
                "10",
                "15",
                "30",
                "60",
                "240",
                "480",
                "720",
                "1440",
                "3D",
                "W",
                "M",
              ] as ResolutionString[],
              supports_marks: true,
              supports_timescale_marks: true,
              supports_time: true,
            }),
          0,
        );
      },

      resolveSymbol: (symbolName, onSymbolResolvedCallback) => {
        setTimeout(() => {
          onSymbolResolvedCallback({
            name: symbolName,
            description: tokenDescription,
            exchange: tokenExchange,
            timezone: "Etc/UTC",
            minmov: 1,
            session: "24x7",
            has_intraday: true,
            type: "crypto",
            supported_resolutions: [
              "1S",
              "10",
              "15",
              "30",
              "60",
              "240",
              "480",
              "720",
              "1440",
              "3D",
              "W",
              "M",
            ] as ResolutionString[],
            pricescale: 100000000,
            ticker: symbolName,
            listed_exchange: "Listed exchange",
            format: "price",
          });
        }, 0);
      },

      getBars: (symbolInfo, resolution, periodParams, onResult) => {
        setTimeout(() => {
          const bars = ohlcvData
            .filter(
              (bar) =>
                bar.time >= periodParams.from &&
                bar.time <= periodParams.to,
            )
            .map((bar) => ({
              time: bar.time * 1000,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              volume: bar.volume,
            }));

          onResult(bars, { noData: !bars.length });
        }, 50);
      },

      subscribeBars: (symbolInfo, resolution, onRealtimeCallback) => {
        intervalId = setInterval(() => {
          const last = ohlcvData.at(-1);
          if (!last) return;

          onRealtimeCallback({
            time: last.time * 1000,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            volume: last.volume,
          });
        }, 10000);
      },

      unsubscribeBars: () => clearInterval(intervalId),

      searchSymbols: (userInput, exchange, symbolType, onResult) => {
        const defaultSymbols = [
          {
            symbol: "TURBO",
            full_name: "TURBO / USD",
            description: "Turbo",
          },
        ];

        const symbols = [...defaultSymbols, ...customSymbols];

        const filtered = symbols
          .filter((s) =>
            s.full_name.toLowerCase().includes(userInput.toLowerCase()),
          )
          .map((s) => ({
            ...s,
            exchange: tokenExchange,
            type: "crypto",
          }));

        onResult(filtered);
      },
    });

    /* =====================
       INIT WIDGET
    ===================== */
    useEffect(() => {
      if (!chartContainerRef.current) return;

      const widgetOptions: ChartingLibraryWidgetOptions = {
        symbol: chartOptions.symbol || "BTCUSDT",
        datafeed: dataFeed(ohlcvData),
        interval:
          (chartOptions.interval as ResolutionString) ||
          ("4H" as ResolutionString),
        container: chartContainerRef.current,
        library_path: chartOptions.library_path,
        locale: "en",
        disabled_features: ["use_localstorage_for_settings"],
        enabled_features: ["study_templates"],
        timezone: "Etc/UTC",
        theme,
        custom_formatters: {
          priceFormatter: {
            format: (price: number) => formatCryptoPrice(price),
          },
        } as any,
      };

      widgetRef.current = new TradingViewWidget(widgetOptions);

      return () => {
        widgetRef.current?.remove();
        clearInterval(intervalId);
      };
    }, [pathname]);

    /* =====================
       READY
    ===================== */
    useEffect(() => {
      if (!widgetRef.current) return;

      widgetRef.current.onChartReady(() => {
        setChartIsReady(true);
      });
    }, []);

    /* =====================
       THEME
    ===================== */
    useEffect(() => {
      if (chartIsReady) {
        widgetRef.current.changeTheme(theme);
      }
    }, [theme, chartIsReady]);

    useEffect(() => {
      if (!chartIsReady) return;

      widgetRef.current._options.datafeed = dataFeed(ohlcvData);
      widgetRef.current.activeChart().resetData();
    }, [ohlcvData, chartIsReady]);

    return <div ref={chartContainerRef} className="TVChartContainer" />;
  },
);

MyTradingView.displayName = "MyTradingView";

export default MyTradingView;