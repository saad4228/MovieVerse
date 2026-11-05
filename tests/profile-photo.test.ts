import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { readPhotoRequest, validateProfilePhoto } from "../lib/profile-photo";

describe("profile photo storage validation",()=>{
  it("accepts a bounded square JPEG and explicit removal",async()=>{
    const bytes=await sharp({create:{width:512,height:512,channels:3,background:"#c69844"}}).jpeg().toBuffer();
    const data=`data:image/jpeg;base64,${bytes.toString("base64")}`;
    expect(validateProfilePhoto(data)).toBe(data);
    expect(validateProfilePhoto(null)).toBeNull();
  });
  it("rejects scripts, corrupt images, oversized payloads and unprepared dimensions",async()=>{
    expect(()=>validateProfilePhoto("data:image/svg+xml;base64,PHN2Zz4=")).toThrow();
    expect(()=>validateProfilePhoto("data:image/jpeg;base64,aGVsbG8=")).toThrow();
    expect(()=>validateProfilePhoto("data:image/jpeg;base64,"+"A".repeat(180000))).toThrow();
    for(const [width,height] of [[800,800],[512,256],[16,16]]){
      const buffer=await sharp({create:{width,height,channels:3,background:"#c69844"}}).jpeg().toBuffer();
      expect(()=>validateProfilePhoto(`data:image/jpeg;base64,${buffer.toString("base64")}`)).toThrow();
    }
  });
  it("caps a streaming request even without content-length",async()=>{
    const request=new Request("https://movieverse.test/api/profile-photo",{method:"POST",body:JSON.stringify({image:"x".repeat(200001)})});
    await expect(readPhotoRequest(request)).rejects.toThrow("too large");
    const valid=new Request("https://movieverse.test/api/profile-photo",{method:"POST",body:'{"image":null}'});
    await expect(readPhotoRequest(valid)).resolves.toEqual({image:null});
  });
});
