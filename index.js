const Parse = require("parse");

let UserDataClass;
let LocationClass;
let SharedDataClass;
let KeyValueDataClass;
let DashboardClass;

let cache = new Map();
let dashboards = new Map();
let locations = new Map();

window.Parse = Parse;

export default class UserAdapter {
  constructor(config) {
    Parse.initialize(config.applicationId, config.javaScriptKey);
    Parse.serverURL = config.url;
    UserDataClass = Parse.Object.extend(config.userDataClass);
    LocationClass = Parse.Object.extend(config.locationClass);
    SharedDataClass = Parse.Object.extend(config.sharedDataClass);
    KeyValueDataClass = Parse.Object.extend(config.keyValueDataClass);
    DashboardClass = Parse.Object.extend(config.dashboardClass);
  }

  async init() {
    window.userAdapter = this;
    window.userAdapterParse = Parse;
  }

  async login(login, password) {
    try {
      let user = await Parse.User.logIn(login, password);

      return this.checkAuth();
    } catch (error) {
      throw new Error("Kombination aus Email und Passwort sind falsch.");
    }
  }

  async logout() {
    try {
      await Parse.User.logOut();
    } catch (error) {
      window.localStorage.clear();
    }
  }

  async register(payload) {
    const user = new Parse.User();

    user.set("username", payload.email);
    user.set("password", payload.password);
    user.set("email", payload.email);

    await user.signUp(null);

    return this.checkAuth();
  }

  async checkAuth() {
    if (Parse.User.current()) {
      let user = Parse.User.current();

      return {
        id: user.id,
        email: user.getEmail(),
        username: user.getUsername(),
        session: user.getSessionToken()
      };
    }

    throw new Error("User not logged in.");
  }

  async getData(key) {
    try {
      // if (cache.has(key)) {
      //     return cache.get(key).get('value');
      // }

      const user = await Parse.User.current();
      let query = new Parse.Query(UserDataClass);
      query.equalTo("user", user);
      query.equalTo("key", key);

      let result = await query.first();

      if (result) {
        cache.set(key, result);
        return result.get("value");
      } else {
        return null;
      }
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async setData(key, value) {
    try {
      // if (cache.has(key)) {
      //     let obj = cache.get(key);

      //     obj.set('value', value);

      //     await obj.save(null);
      // } else {
      const user = await Parse.User.current();

      let obj = new UserDataClass();

      obj.set("user", user);
      obj.set("key", key);
      obj.set("value", value);

      await obj.save(null);

      cache.set(key, obj);
      // }

      return true;
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async listDashboards() {
    try {
      let query = new Parse.Query(DashboardClass);

      let result = await query.find();

      for (const dashboard of result) {
        dashboards.set(dashboard.id, dashboard);
      }

      return result.map(dashboard => dashboard.id);
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async getDashboard(id) {
    try {
      await this.listDashboards();

      let dashboard = dashboards.get(id);

      return {
        id: dashboard.id,
        location: dashboard.get("location"),
        name: dashboard.get("name"),
        version: dashboard.get("version"),
        widgets: JSON.parse(dashboard.get("widgets"))
      };
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async setDashboard({ id, name, location, widgets, version }) {
    try {
      let dashboard = dashboards.get(id);

      dashboard.set("location", location);
      dashboard.set("name", name);
      dashboard.set("version", version);
      dashboard.set("widgets", JSON.stringify(widgets));

      await dashboard.save();
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async createDashboard({ name, location, widgets, version }) {
    try {
      let dashboard = new DashboardClass();

      dashboard.set("owner", Parse.User.current());
      dashboard.set("location", location);
      dashboard.set("name", name);
      dashboard.set("version", version);
      dashboard.set("widgets", JSON.stringify(widgets));

      dashboard.setACL(new Parse.ACL(Parse.User.current()));

      await dashboard.save();

      return dashboard.id;
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async deleteDashboard(id) {
    try {
      let dashboard = dashboards.get(id);

      // delete the dashboard from cache
      dashboards.delete(id);

      // delete the dashboard in parse
      await dashboard.delete();

      return dashboard.id;
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async listLocations() {
    try {
      let query = new Parse.Query(LocationClass);

      let result = await query.find();

      for (const location of result) {
        locations.set(location.id, location);
      }

      return result.map(location => {
        return Object.assign({ id: location.id }, location.toJSON());
      });
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async listUsers() {
    let users = await new Parse.Query(Parse.User).find();

    users = users.filter(u => u.id !== Parse.User.current().id);
    console.log(users);

    return users.map(user => {
      return {
        id: user.id,
        name: user.get("username"),
        email: user.get("email")
      };
    });
  }

  async shareDashboardWithUser(dashboardID, userID) {
    try {
      let dashboard = dashboards.get(dashboardID);

      dashboard.getACL().setReadAccess(userID, true);
      dashboard.getACL().setWriteAccess(userID, true);

      await dashboard.save();
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async listSharedData(type) {
    try {
      let query = new Parse.Query(SharedDataClass);

      query.equalTo("show", true);
      query.equalTo("type", type);

      let result = await query.find();

      return result.map(x => JSON.parse(x.get("data")));
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async createSharedData(type, data) {
    try {
      let x = new SharedDataClass();

      x.set("owner", Parse.User.current());
      x.set("type", type);
      x.set("show", true);
      x.set("data", JSON.stringify(data));

      await x.save();

      return true;
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async getKeyValueData(key) {
    try {
      let query = new Parse.Query(KeyValueDataClass);

      let result = await query.get(key);

      return JSON.parse(result.get("data"));
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }

  async createKeyValueData(data) {
    try {
      let x = new KeyValueDataClass();

      x.set("owner", Parse.User.current());
      x.set("data", JSON.stringify(data));

      await x.save();

      return x.id;
    } catch (error) {
      throw new Error(`User Adapter Error: ${error.code} ${error.message}`);
    }
  }
}
