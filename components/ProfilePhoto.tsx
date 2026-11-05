"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { Modal } from "./ui";

export default function ProfilePhoto({name,notify}:{name:string;notify:(message:string)=>void}) {
  const input=useRef<HTMLInputElement>(null);
  const [avatar,setAvatar]=useState<string|null>(null);
  const [candidate,setCandidate]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    api<{avatar:string|null}>("profile").then(data=>{if(active)setAvatar(data.avatar);}).catch(()=>{if(active)setError("Photo settings are unavailable. Please refresh and try again.");});
    return ()=>{active=false;};
  },[]);
  async function choose(file?:File) {
    if(!file)return;
    setError("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setError("Choose a JPEG, PNG or WebP image.");return;}
    if(file.size>8*1024*1024){setError("Choose a photo smaller than 8 MB.");return;}
    setBusy(true);
    let bitmap:ImageBitmap|undefined;
    try {
      bitmap=await createImageBitmap(file);
      if(bitmap.width*bitmap.height>40000000)throw new Error("Choose a smaller photo, up to 40 megapixels.");
      const canvas=document.createElement("canvas");canvas.width=canvas.height=512;
      const context=canvas.getContext("2d");if(!context)throw new Error("Your browser could not prepare this photo.");
      const side=Math.min(bitmap.width,bitmap.height);
      context.fillStyle="#17121a";context.fillRect(0,0,512,512);
      context.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,512,512);
      let photo=canvas.toDataURL("image/jpeg",.85);
      if(photo.length>180000)photo=canvas.toDataURL("image/jpeg",.65);
      if(photo.length>180000)throw new Error("Choose a simpler or smaller photo.");
      setCandidate(photo);
    } catch(error){setError(error instanceof Error?error.message:"This image could not be opened.");}
    finally {bitmap?.close();setBusy(false);if(input.current)input.current.value="";}
  }
  async function save(image:string|null) {
    setBusy(true);setError("");
    try {
      const result=await api<{avatar:string|null}>("profile-photo",{image});
      setAvatar(result.avatar);setCandidate("");notify(image?"Profile photo saved.":"Profile photo removed.");
    } catch(error){setError(error instanceof Error?error.message:"Your photo could not be saved.");}
    finally {setBusy(false);}
  }
  return <div className="profile-photo-control">
    <input ref={input} className="profile-photo-file" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" onChange={event=>void choose(event.target.files?.[0])}/>
    <button type="button" className="profile-photo-avatar" aria-label={avatar?"Change profile photo":"Add profile photo"} disabled={busy} onClick={()=>input.current?.click()}>
      {avatar?<img src={avatar} alt={`${name}'s profile photo`} width={104} height={104} onError={()=>setAvatar(null)}/>:<span aria-hidden="true">{name.slice(0,1).toUpperCase()}</span>}
      <span className="profile-photo-camera" aria-hidden="true"><Camera size={15}/></span>
    </button>
    <button type="button" className="text-link photo-change" disabled={busy} onClick={()=>input.current?.click()}>{busy?"Preparing...":avatar?"Change photo":"Add photo"}</button>
    {avatar&&<button type="button" className="photo-remove" aria-label="Remove profile photo" disabled={busy} onClick={()=>void save(null)}><Trash2 size={12}/>Remove</button>}
    {error&&!candidate&&<p className="photo-feedback" role="alert">{error}</p>}
    {candidate&&<Modal title="Preview profile photo" onClose={()=>{if(!busy)setCandidate("");}}>
      <div className="profile-photo-preview"><span className="eyebrow">MAKE IT YOURS</span><h2>Your profile photo.</h2><img src={candidate} alt="Profile photo preview" width={200} height={200}/><p>Your photo is cropped to a square and displayed in a circle.</p><p className="photo-file-hint">JPEG, PNG or WebP · up to 8 MB</p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="photo-preview-actions"><button className="btn btn-outline" disabled={busy} onClick={()=>setCandidate("")}>Cancel</button><button className="btn btn-gold" disabled={busy} onClick={()=>void save(candidate)}><Upload size={15}/>{busy?"Saving...":"Save photo"}</button></div></div>
    </Modal>}
  </div>;
}
