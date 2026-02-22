import React, { ReactNode } from "react";

function HiddenElementForSeo({ children }: { children: ReactNode }) {
  return <div className="sr-only">{children}</div>;
}

export default HiddenElementForSeo;
