import readdirp from "readdirp";
import PQueue from "p-queue";
import { resolve,join} from "path";
import fs from 'fs';
import { createReadStream } from "fs";
const queue = new PQueue({ concurrency: 10 });
export default class Upload {
  constructor(cos, bucket, region) {
    this.cos = cos;
    this.bucket = bucket;
    this.region = region;
  }
  getLocalFiles(jsonPath) {
    let jsonFiles = [];
    function findJsonFile(path) {
      let files = fs.readdirSync(path);
      files.forEach(function (item, index) {
        let fPath = join(path, item);
        let stat = fs.statSync(fPath);
        if (stat.isDirectory() === true) {
          findJsonFile(fPath);
        }
        if (stat.isFile() === true) {
          jsonFiles.push(fPath);
        }
      });
    }
    findJsonFile(jsonPath);
    const temp = [];
    jsonFiles.map((item) => {
      const a = item.replace("dist/", "");
      temp.push(a);
    });
    return temp;
  }
  isExistObject(objName){
   this.cos.headObject(
      {
        Bucket:this.bucket /* 必须 */,
        Region:this.region/* 必须 */,
        Key: objName /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */,
      },
      function (err, data) {
        if (data) {
          console.log("对象存在");
          return false;
        } else if (err.statusCode == 404) {
          console.log("对象不存在");
          return true;
        } else if (err.statusCode == 403) {
          console.log("没有该对象读权限");
        }
      }
    );
  }
  push(fileName,withHash){
    const file = resolve("./dist",fileName);
    const exist = withHash ? this.isExistObject(fileName) : false;
    if (!exist) {
    const cacheControl = withHash ? "max-age=31536000" : "no-cache";
    this.cos.putObject(
      {
        Bucket:this.bucket,
        Region:this.region,
        Key: fileName,
        StorageClass: "STANDARD",
        Body: createReadStream(file), // 上传文件对象
        Headers: {
          cacheControl: cacheControl,
        },
        onProgress: function (progressData) {
          console.log(JSON.stringify(progressData));
        },
      },
      function (err, data) {
        console.log(err || data);
      }
    );
    console.log(`Done: ${fileName}`);
  } else {
    // 如果该文件在 OSS 已存在，则跳过该文件 (Object)
    console.log(`Skip: ${fileName}`);
  }
  }
  async pushAll(){
  await this.delete()
  for await (const entry of readdirp("./dist", { depth: 0, type: "files" })) {
    queue.add(() => this.push(entry.path,false));
  }
  for await (const entry of readdirp("./dist/assets", { type: "files" })) {
    queue.add(() => this.push(`assets/${entry.path}`,true));
  }
  }
  delete(){
    this.cos.getBucket(
      {
        Bucket:this.bucket /* 填入您自己的存储桶，必须字段 */,
        Region:this.region /* 存储桶所在地域，例如ap-beijing，必须字段 */,
      },
      
      (listError, listResult) => {
        if (listError) return console.log('list error:', listError);
        const objects = listResult.Contents.map(function (item) {
          return item.Key;
        });
        const localFiles = this.getLocalFiles('./dist');
        const deleteObj = []
        for (const object of objects) {
          // 如果当前目录中不存在该文件，则该文件可以被删除
          if (!localFiles.includes(object)) {
            deleteObj.push({Key:object})
          }
        }
        this.cos.deleteMultipleObject({
          Bucket:this.bucket,
          Region:this.region,
          Objects:deleteObj
        },function (err,res){
          if(err){
            console.log('delete stop');
          }else{
           console.log(res)      
          }
        })
      }
    );
  }
}
