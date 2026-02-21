import {
  Bar,
  HistoryMetadata,
  LibrarySymbolInfo,
  PeriodParams,
} from "../../../charting_library/datafeed-api";

import {
  getErrorMessage,
  RequestParams,
  UdfErrorResponse,
  UdfOkResponse,
  UdfResponse,
} from "./helpers";

import { IRequester } from "./irequester";

interface HistoryPartialDataResponse extends UdfOkResponse {
  t: any;
  c: any;
}

interface HistoryFullDataResponse extends UdfOkResponse {
  t: any;
  c: any;
  o: any;
  h: any;
  l: any;
  v: any;
}

interface HistoryNoDataResponse extends UdfResponse {
  s: "no_data";
  nextTime?: number;
}

type HistoryResponse =
  | HistoryFullDataResponse
  | HistoryPartialDataResponse
  | HistoryNoDataResponse;

export interface GetBarsResult {
  bars: Bar[];
  meta: HistoryMetadata;
}

export class HistoryProvider {
  private _datafeedUrl: string;
  private readonly _requester: IRequester;

  public constructor(datafeedUrl: string, requester: IRequester) {
    this._datafeedUrl = datafeedUrl;
    this._requester = requester;
  }

  public getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
  ): Promise<GetBarsResult> {
    const requestParams: RequestParams = {
      symbol: symbolInfo.ticker || "",
      resolution: resolution,
      from: periodParams.from,
      to: periodParams.to,
    };

    return new Promise(async (resolve, reject) => {
      try {
        const response = await this._requester.sendRequest<HistoryResponse>(
          this._datafeedUrl,
          "history",
          requestParams,
        );

        resolve(this._processHistoryResponse(response));
      } catch (e: unknown) {
        reject(getErrorMessage(e as any));
      }
    });
  }

  private _processHistoryResponse(
    response: HistoryResponse | UdfErrorResponse,
  ): GetBarsResult {
    if (response.s !== "ok" && response.s !== "no_data") {
      throw new Error(response.errmsg);
    }

    const bars: Bar[] = [];
    const meta: HistoryMetadata = { noData: false };

    if (response.s === "no_data") {
      meta.noData = true;
      meta.nextTime = response.nextTime;
      return { bars, meta };
    }

    const volumePresent = "v" in response;
    const ohlPresent = "o" in response;

    for (let i = 0; i < response.t.length; i++) {
      let time = response.t[i];

      if (time < 10_000_000_000) {
        time *= 1000;
      }

      const bar: Bar = {
        time,
        close: Number(response.c[i]),
        open: Number(response.c[i]),
        high: Number(response.c[i]),
        low: Number(response.c[i]),
      };

      if (ohlPresent) {
        bar.open = Number((response as HistoryFullDataResponse).o[i]);
        bar.high = Number((response as HistoryFullDataResponse).h[i]);
        bar.low = Number((response as HistoryFullDataResponse).l[i]);
      }

      if (volumePresent) {
        bar.volume = Number((response as HistoryFullDataResponse).v[i]);
      }

      bars.push(bar);
    }

    bars.sort((a, b) => a.time - b.time);

    return { bars, meta };
  }
}
