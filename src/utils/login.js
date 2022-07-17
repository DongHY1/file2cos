import COS from "cos-nodejs-sdk-v5";
export default function login (id,key){
    const cos = new COS({
        SecretId:id,
        SecretKey:key,
    });
    return cos
}
