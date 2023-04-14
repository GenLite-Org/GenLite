const path = require('path');
const webpack = require('webpack');
const fs = require('fs');
const XMLHttpRequest  = require('./node_modules/xmlhttprequest');

let configStuff
if(process.env.type == "development") {
  configStuff = require('./configStuff.json');
}

const TerserPlugin = require("terser-webpack-plugin");
const PACKAGE = require('../GenLite/package.json');
let METADATA = fs.readFileSync('./userscript-banner.txt', 'utf8').replace('${version}', PACKAGE.version);

// Open README.md and replace version string
let readme = fs.readFileSync('./README.md', 'utf8');

// Version String in README
// # GenLite 0.1.28 - For GenFanad
// Look for match on the last set of numbers and increment by 1
let versionString = readme.match(/# GenLite [0-9.]+(-[0-9]+)? - For GenFanad/)[0];

// PACKAGE.version = 0.1.28
let newVersionString = versionString.replace(/[0-9.]+(-[0-9]+)?/, PACKAGE.version);

// Update README with latest version
readme = readme.replace(versionString, newVersionString);

// Write README.md
fs.writeFileSync('./README.md', readme);

module.exports = (env, argv) => {
  let modules = [];
  if (argv.mode === 'production') {
    modules.push(
      {
        mode: 'production',
        resolve: {
          extensions: ['.ts', '.js', '.json']
        },
        module: {
          rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
              test: /\.tsx?$/,
              loader: 'ts-loader',
              exclude: /node_modules/,
            },
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            {
              test: /\.js$/,
              loader: "source-map-loader"
            }
          ]
        },
        entry: './src/Client/index.ts',
        output: {
          filename: 'genliteClient.user.js',
          path: path.resolve(__dirname, 'dist'),
        },
        optimization: {
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                output: {
                  beautify: false,
                  comments: false
                },
              },
              extractComments: true,
            })
          ],
        },
      });
  } else {
    modules.push(
      {
        mode: 'development',
        resolve: {
          extensions: ['.ts', '.js', '.json']
        },
        module: {
          rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
              test: /\.tsx?$/,
              loader: 'ts-loader',
              exclude: /node_modules/,
            },
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            {
              test: /\.js$/,
              loader: "source-map-loader"
            }
          ]
        },
        entry: './src/Client/index.ts',
        output: {
          filename: 'genlite.dev.user.js',
          path: path.resolve(__dirname, 'dist'),
        },
        optimization: {
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                output: {
                  beautify: false,
                  preamble: METADATA,
                  comments: false
                },
              },
              extractComments: true,
            })
          ],
        },
        plugins: [
          new webpack.BannerPlugin({
            raw: true,
            banner: METADATA
          })
        ]
      });
  };

  let repoOwner;
  if (env.type == 'development'){
    repoOwner = configStuff.repository_owner;
  } else {
    repoOwner = env.repoOwner;
    console.log("repo owner", process.env.repoOwner)
  }
  let githubConfig = {};
  if (env.type == "release") {
    githubConfig.releasesUrl = `https://api.github.com/repos/${repoOwner}/GenLite/releases/latest`
    githubConfig.distUrl = `https://raw.githubusercontent.com/${repoOwner}/GenLite/release/dist/genliteClient.user.js`
  } else {
    let release = new XMLHttpRequest.XMLHttpRequest();
    release.open('GET', `https://api.github.com/repos/${repoOwner}/GenLite/releases`, false);
    release.setRequestHeader("Accept", "application/vnd.github.v3+json")
    release.send();
    let releasesArray = eval(release.responseText);
    githubConfig.releasesUrl = releasesArray[0].url
    githubConfig.distUrl = `https://raw.githubusercontent.com/${repoOwner}/GenLite/beta/dist/genliteClient.user.js`

  }
  fs.writeFileSync('./src/Loader/githubConfig.json', JSON.stringify(githubConfig));
  modules.push(
    {
      mode: 'production',
      resolve: {
        extensions: ['.ts', '.js', '.json']
      },
      module: {
        rules: [
          // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
          {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            exclude: /node_modules/,
          },
          // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
          {
            test: /\.js$/,
            loader: "source-map-loader"
          }
        ]
      },
      entry: './src/Loader/',
      output: {
        filename: 'genlite.user.js',
        path: path.resolve(__dirname, 'dist'),
      },
      optimization: {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              output: {
                beautify: false,
                preamble: METADATA,
                comments: false
              },
            },
            extractComments: true,
          })
        ],
      },
      plugins: [
        new webpack.BannerPlugin({
          raw: true,
          banner: METADATA
        })
      ]
    });
  return modules;
};
