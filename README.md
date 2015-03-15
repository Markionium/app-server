# App server proxy to dhis2

It allows you to add tags to your index.html of your app to inject api data into the page.

When running apps this will give you the ability to preload some data through the first page load and save you some api calls.

Adding the following script tag to your html will replace it with a script tag that contains a iife that contains the data for the user profile.

```html
<script type="dhis/api-data" data-url="/api/me" data-variable="currentUser"></script>
```

The result will somewhat like the following

```html
<script type="text/javascript" data-url="/api/me" data-variable="currentUser">
(function (apiInjections) {
  apiInjections["currentUser"] = {
    "id":"ab7NYsOIsQM",
    "created":"2014-09-25T10:51:08.607+0000",
    "name":"Mark Polak",
    "lastUpdated":"2015-01-02T12:20:56.562+0000",
    "surname":"Polak",
    "externalAccess":false,
    "firstName":"Mark",
    "displayName":"Mark Polak",
    "userCredentials":{"id":"AwJXesXAAGU","name":"Mark Polak","code":"markpo","created":"2014-09-25T10:51:08.579+0000","lastUpdated":"2015-03-15T22:51:15.129+0000"},
    "organisationUnits":[{"id":"ybg3MO3hcf4","name":"Global","code":"ybg3MO3hcf4","created":"2014-01-28T02:11:57.990+0000","lastUpdated":"2015-01-13T11:15:36.692+0000"}],
    "dataViewOrganisationUnits":[{"id":"ybg3MO3hcf4","name":"Global","code":"ybg3MO3hcf4","created":"2014-01-28T02:11:57.990+0000","lastUpdated":"2015-01-13T11:15:36.692+0000"}],
    "attributeValues":[],
    "userGroups":[{"id":"iuD8wUFz95X","name":"Data SIMS access","created":"2014-09-29T08:44:09.145+0000","lastUpdated":"2015-02-02T08:28:02.230+0000"}],
    "userGroupAccesses":[]}
  })(window.apiInjections = window.apiInjections || {});
</script>
```
