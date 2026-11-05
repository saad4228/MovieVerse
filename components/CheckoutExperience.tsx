"use client";
import "./checkout-experience.css";
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowRight,Check,ShieldCheck,AlertCircle,UserRound,Mail,Tag,X,Sparkles,LockKeyhole,RotateCcw} from "lucide-react";
import type {Seat,Show} from "@/lib/catalog";
import {calculatePrice,rupees} from "@/lib/booking";
import {checkoutOffer,checkoutOffers,couponDiscount} from "@/lib/checkout-offers";
import {useApp} from "@/lib/store";
import {api} from "@/lib/client";
import {bookingProvider} from "@/lib/providers";
import {markTicketArrival} from "@/lib/ticket-experience";

const methods=[
  {id:"UPI",title:"UPI",description:"Pay by UPI app",image:"upi.png",detail:"A familiar UPI experience, safely simulated. No UPI ID or PIN is needed."},
  {id:"Card",title:"Cards",description:"Debit & credit cards",image:"visa-mastercard.png",detail:"Explore card checkout without entering a card number, expiry or CVV."},
  {id:"Net banking",title:"Net Banking",description:"Your bank, online",image:"net-banking.png",detail:"Preview bank payment without signing into a bank or sharing credentials."},
] as const;
type FieldErrors={name?:string;email?:string};
function validate(name:string,email:string):FieldErrors {
  return {
    ...(name.trim().length<2||name.trim().length>80?{name:"Enter your name using 2–80 characters."}:{}),
    ...(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||email.trim().length>254?{email:"Enter a valid email address."}:{}),
  };
}

export default function CheckoutExperience({show,selected,active,notify,renderSummary}:{
  show:Show;selected:Seat[];active:boolean;notify:(text:string)=>void;
  renderSummary:(promo:string,children:ReactNode)=>ReactNode;
}) {
  const router=useRouter();
  const cart=useApp(s=>s.cart),savedPromo=useApp(s=>s.showId===show.id?s.promoCode:"");
  const setPromo=useApp(s=>s.setPromo);
  const promo=checkoutOffer(savedPromo??"")?.code??"";
  const [name,setName]=useState(""),[email,setEmail]=useState("");
  const [fields,setFields]=useState<FieldErrors>({});
  const nameInput=useRef<HTMLInputElement>(null),emailInput=useRef<HTMLInputElement>(null);
  const [draft,setDraft]=useState(""),[feedback,setFeedback]=useState({kind:"",text:""});
  const [celebration,setCelebration]=useState(0);
  const [method,setMethod]=useState<(typeof methods)[number]["id"]>("UPI");
  const [outcome,setOutcome]=useState<"success"|"failure"|"cancel">("success");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [confirmed,setConfirmed]=useState(false);
  const lock=useRef(false),request=useRef(crypto.randomUUID());
  const errorRef=useRef<HTMLDivElement>(null);
  const pricing=calculatePrice(selected,show,cart,promo);
  const chosen=methods.find(m=>m.id===method)!;
  useEffect(()=>{let current=true;api("session").then(result=>{
    if(current&&result.user){setName(value=>value||result.user.name);setEmail(value=>value||result.user.email);}
  }).catch(()=>{});return()=>{current=false;};},[]);
  // A snack offer ceases to apply when the user removes all snacks on the prior step.
  const applicablePromo=promo&&couponDiscount(promo,pricing.tickets,pricing.food)>0;
  useEffect(()=>{
    if(promo&&!applicablePromo){setPromo("");setFeedback({kind:"info",text:"Coupon removed because this order no longer meets its terms."});}
  },[promo,applicablePromo,setPromo]);
  function apply(code:string){
    if(busy||!active)return;
    const offer=checkoutOffer(code);
    if(!offer){setFeedback({kind:"error",text:"That code isn't valid. Choose an available demo offer."});return;}
    const savings=couponDiscount(offer.code,pricing.tickets,pricing.food);
    if(!savings){setFeedback({kind:"error",text:offer.scope==="food"?"Add snacks to use SNACKTIME.":"Select tickets to use this offer."});return;}
    if(promo===offer.code)return;
    setPromo(offer.code);setDraft(offer.code);setCelebration(value=>value+1);
    setFeedback({kind:"success",text:`Coupon applied successfully! You save ${rupees(savings)}.`});
  }
  function remove(){setPromo("");setDraft("");setCelebration(0);setFeedback({kind:"info",text:"Coupon removed. Your payable amount has been updated."});}
  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(lock.current||!active||!selected.length)return;
    const invalid=validate(name,email);setFields(invalid);
    if(invalid.name||invalid.email){(invalid.name?nameInput:emailInput).current?.focus();return;}
    lock.current=true;setBusy(true);setError("");
    try{
      const result=await bookingProvider.checkout({showId:show.id,seats:selected.map(s=>s.id),cart,promo,requestId:request.current,outcome});
      // Success is shown only after the existing backend confirms the reservation.
      setConfirmed(true);markTicketArrival(result.id);router.push(`/booking/confirmation/${result.id}`);
    }catch(failure){setConfirmed(false);lock.current=false;setBusy(false);const message=(failure as Error).message;setError(message);notify(message);requestAnimationFrame(()=>errorRef.current?.focus());}
  }
  return <form className="checkout-columns premium-checkout" onSubmit={submit} noValidate aria-busy={busy}>
    <section>
      <div className="page-intro compact">
        <span className="eyebrow">YOU’RE ONE SCENE AWAY</span>
        <h1>Make it <span>official.</span></h1>
        <p>Your story. Your seats. All in one place.</p>
        <span className="checkout-demo-pill"><ShieldCheck size={13}/> DEMO CHECKOUT · NO REAL CHARGE</span>
      </div>
      <div className="checkout-block customer-block">
        <div className="block-heading"><span>01</span><div><h3>A name for your ticket.</h3><p>Demo details stay in this form. No email is sent.</p></div></div>
        <div className="form-row">
          <label htmlFor="checkout-name">Your name
            <span className={`checkout-field${fields.name?" has-error":""}`}><UserRound size={17}/><input id="checkout-name" aria-label="Your name" ref={nameInput} required autoComplete="name" minLength={2} maxLength={80} value={name} disabled={busy} onChange={e=>{setName(e.target.value);if(fields.name)setFields(f=>({...f,name:validate(e.target.value,email).name}));}} onBlur={()=>setFields(f=>({...f,name:validate(name,email).name}))} aria-invalid={!!fields.name} aria-describedby={fields.name?"checkout-name-error":undefined} placeholder="Your full name"/></span>
            {fields.name&&<small className="field-error" id="checkout-name-error">{fields.name}</small>}
          </label>
          <label htmlFor="checkout-email">Email address
            <span className={`checkout-field${fields.email?" has-error":""}`}><Mail size={17}/><input id="checkout-email" aria-label="Email address" ref={emailInput} required type="email" autoComplete="email" maxLength={254} value={email} disabled={busy} onChange={e=>{setEmail(e.target.value);if(fields.email)setFields(f=>({...f,email:validate(name,e.target.value).email}));}} onBlur={()=>setFields(f=>({...f,email:validate(name,email).email}))} aria-invalid={!!fields.email} aria-describedby={fields.email?"checkout-email-error":undefined} placeholder="you@example.com"/></span>
            {fields.email&&<small className="field-error" id="checkout-email-error">{fields.email}</small>}
          </label>
        </div>
      </div>
      <div className={`checkout-block coupon-block${promo?" has-coupon":""}`}>
        {!!celebration&&promo&&<span key={`glow-${celebration}`} className="coupon-success-wash" aria-hidden="true"/>}
        <div className="block-heading"><span>02</span><div><h3>A little treat, on us.</h3><p>One demo offer per booking. Savings update instantly.</p></div></div>
        <div className="checkout-offers" aria-label="Available demo offers">
          {checkoutOffers.map(offer=>{
            const saving=couponDiscount(offer.code,pricing.tickets,pricing.food),applied=promo===offer.code;
            return <button type="button" className={`checkout-offer${applied?" is-applied":""}`} key={offer.code} disabled={busy||!active} onClick={()=>apply(offer.code)} aria-label={`Use ${offer.code}`} aria-describedby={`offer-${offer.code}-terms`} aria-pressed={applied}>
              <Tag size={17}/><span><strong>{offer.code}</strong><small id={`offer-${offer.code}-terms`}>{offer.description}</small><em>{saving?`Save ${rupees(saving)}`:"Add snacks to unlock"}</em></span>{applied?<Check size={16}/>:<ArrowRight size={16}/>}
            </button>;
          })}
        </div>
        <div className="promo-input">
          <input aria-label="Promo code" placeholder="Enter promo code" value={promo||draft} maxLength={30} disabled={busy||!!promo} onChange={e=>{setDraft(e.target.value.toUpperCase());setFeedback({kind:"",text:""});}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();apply(draft);}}} aria-invalid={feedback.kind==="error"} aria-describedby="coupon-feedback"/>
          {promo?<><span key={celebration} className={`coupon-applied${celebration?" celebrate":""}`}><Check size={15}/> Applied{!!celebration&&<span className="coupon-sparkles" aria-hidden="true">{Array.from({length:6},(_,i)=><i key={i} style={{"--spark-x":`${Math.cos(i*Math.PI/3)*26}px`,"--spark-y":`${Math.sin(i*Math.PI/3)*23}px`,"--spark-delay":`${i%3*35}ms`} as CSSProperties}/>)}</span>}</span><button type="button" className="coupon-remove" aria-label="Remove coupon" title="Remove coupon" disabled={busy} onClick={remove}><X size={17}/></button></>:<button type="button" className="btn btn-outline" disabled={busy||!active} onClick={()=>apply(draft)}>Apply</button>}
        </div>
        <div id="coupon-feedback" className={`coupon-feedback ${feedback.kind}`} role="status" aria-live="polite" key={`message-${celebration}`}>{feedback.text&&<>{feedback.kind==="success"?<Check size={14}/>:feedback.kind==="error"?<AlertCircle size={14}/>:<Tag size={14}/>}<span>{feedback.text}</span></>}</div>
      </div>
      <div className="checkout-block payment-block">
        <div className="block-heading"><span>03</span><div><h3>Your way to pay.</h3><p>Choose a payment experience. Every method below is simulated.</p></div></div>
        <div className="payment-methods" role="group" aria-label="Payment method">
          {methods.map(({id,title,description,image})=><button type="button" key={id} className={method===id?"selected":""} aria-label={id} aria-pressed={method===id} disabled={busy} onClick={()=>setMethod(id)}>
            <span className="payment-method-icon"><img src={`/assets/payments/${image}`} alt="" width={64} height={44}/></span><strong>{title}</strong><small>{description}</small><span className="method-check">{method===id&&<Check size={12}/>}</span>
          </button>)}
        </div>
        <div className="test-payment" key={method}><span className="payment-method-icon"><img src={`/assets/payments/${chosen.image}`} alt="" width={64} height={44}/></span><div><strong>{method} · Test payment</strong><p>{chosen.detail}</p><small>No live payment provider is connected.</small></div></div>
        <label className="test-outcome">Simulated result<select disabled={busy} value={outcome} onChange={e=>{setOutcome(e.target.value as typeof outcome);setError("");}}><option value="success">Successful payment</option><option value="failure">Payment failure</option><option value="cancel">Payment cancelled</option></select></label>
      </div>
      {error&&<div ref={errorRef} tabIndex={-1} className="checkout-failure" role="alert"><AlertCircle size={20}/><div><strong>Booking could not be completed</strong><p>{error}</p><span><RotateCcw size={13}/> You can retry using the Pay Now button.</span></div></div>}
      {!active&&<p className="form-error" role="alert">Your seat reservation is no longer active. <Link href={`/booking/${encodeURIComponent(show.id)}/seats`}>Return to seat selection</Link>.</p>}
      <p className="fine-print">This is a demonstration reservation. No real payment is taken. The QR ticket is valid only within this demo.</p>
    </section>
    {renderSummary(promo,<>
      {!!pricing.discount&&<div className="checkout-savings"><Sparkles size={15}/> You save {rupees(pricing.discount)} with {promo}</div>}
      <button className="btn btn-gold checkout-pay" type="submit" disabled={!active||!selected.length||busy}>
        {confirmed?<><Check size={19}/>Booking confirmed</>:busy?<><span className="spinner"/>Confirming your booking…</>:<><span>Pay Now {rupees(pricing.total)}<small>Test payment</small></span><ArrowRight size={19}/></>}
      </button>
      <p className="checkout-security" role={busy?"status":undefined}><LockKeyhole size={12}/>{confirmed?"Your demo booking is confirmed. Opening your ticket…":busy?"Waiting for the demo booking server. Please keep this page open.":"Simulation only. No banking credentials required."}</p>
      <Link className="summary-back" aria-disabled={busy} onClick={event=>{if(busy)event.preventDefault();}} href={`/booking/${encodeURIComponent(show.id)}/snacks`}>Edit snacks</Link>
    </>)}
  </form>;
}
