const { merge } = require("webpack-merge");

const commonConfig = require("./config/webpack.common");
const productionConfig = require("./config/webpack.prod");
const developmentConfig = require("./config/webpack.dev");

module.exports = (env, args) => {
    switch (args.mode) {
        case 'development':
            // @ts-ignore
            return merge(commonConfig, developmentConfig);
        case 'production':
            // @ts-ignore
            return merge(commonConfig, productionConfig);
        default:
            throw new Error('No matching configuration was found!');
    }
}