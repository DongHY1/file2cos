#! /usr/bin/env node
import inquirer from "inquirer";
import login from "./src/utils/login.js";
import Upload from "./src/utils/upload.js";
async function init() {
  inquirer
    .prompt([
      {
        type: "input", //type： input, number, confirm, list, checkbox ...
        name: "id", // key 名
        message: "输入你的ID",
      },
      {
        type: "input", //type： input, number, confirm, list, checkbox ...
        name: "key", // key 名
        message: "输入你的Key",
      },
      {
        type: "input", //type： input, number, confirm, list, checkbox ...
        name: "bucket", // key 名
        message: "输入你的Bucket Name",
      },
      {
        type: "input", //type： input, number, confirm, list, checkbox ...
        name: "region", // key 名
        message: "输入你的Region Name",
      },
    ])
    .then(async (answers) => {
      const { id, key, bucket, region } = answers;
      const cos = await login(
        id,
        key
      );
      const load = new Upload(cos, bucket,region);
      load.pushAll();
    });
}

init().catch((err) => {
  console.error(err);
});
