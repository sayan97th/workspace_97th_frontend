// Default PM2 config — points to the production environment.
// For other environments use the dedicated files:
//   pm2 start ecosystem/ecosystem.testing.config.js
//   pm2 start ecosystem/ecosystem.production.config.js
//   pm2 start ecosystem/ecosystem.local.config.js
module.exports = require("./ecosystem/ecosystem.production.config.js");
