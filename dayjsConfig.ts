/////////////////////////dayjsConfig.ts///////////////////////////

// this file is used to configure dayjs and export it globally

/////////////////////////////////////////////////////////////////

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

// initialize global dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

export default dayjs;
