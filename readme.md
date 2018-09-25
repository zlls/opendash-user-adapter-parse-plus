# Advanced Parse User Adapter for open.DASH

## Usage

```js
import instance from "opendash";
import userAdapter from "@opendash/user-adapter-parse-plus";

instance.registerUserAdapter(userAdapter, {
  url: "https://example.com/parse",
  applicationId: "xxx",
  userDataClass: "OpenDashUserData",
  locationClass: "OpenDashLocations",
  sharedDataClass: "OpenDashSharedData",
  keyValueDataClass: "OpenDashKeyValueData",
  dashboardClass: "OpenDashDashboards"
});
```
