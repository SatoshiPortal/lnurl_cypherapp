// import { LnurlWithdrawEntity } from "../entity/LnurlWithdrawEntity";

import { LnurlWithdrawEntity } from "@prisma/client";

export default interface ILnurlWithdraw extends LnurlWithdrawEntity {
  lnurlDecoded: string;
}
