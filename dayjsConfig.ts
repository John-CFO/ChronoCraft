/////////////////////dayjsConfig.ts//////////////////////

// this file is used to configure dayjs and export it globally

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// initialize global dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

export default dayjs;
