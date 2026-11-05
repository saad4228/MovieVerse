import { z } from "zod";
import {makeSeats,categories} from "./catalog";
const color=z.string().regex(/^#[a-fA-F0-9]{6}$/);
export const blueprintSchema = z
        .object({
          id: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
          name: z.string().min(1).max(100),
          width: z.number().min(18).max(60),
          depth: z.number().min(20).max(60),
          height: z.number().min(8).max(30),
          rows: z.number().int().min(4).max(20),
          columns: z.number().int().min(8).max(30),
          rowLengths: z
            .array(z.number().int().min(1).max(30))
            .max(20)
            .optional(),
          aisles: z.array(z.number().int().min(1).max(29)).max(3),
          spacing: z.number().min(0.9).max(1.8),
          rowSpacing: z.number().min(1.3).max(2.5),
          slope: z.number().min(0.1).max(0.4),
          screenWidth: z.number().min(10).max(45),
          screen: z
            .object({
              width: z.number().min(6).max(45),
              height: z.number().min(3).max(24),
              position: z.tuple([
                z.number().finite(),
                z.number().finite(),
                z.number().finite(),
              ]),
              rotationY: z.number().min(-0.3).max(0.3).optional(),
            })
            .optional(),
          balcony: z.boolean(),
          balconyRows:z.number().int().min(1).max(8).optional(),
          balconyElevation:z.number().min(1.5).max(5).optional(),
          style: z.enum(["classic", "grand", "luxury"]),
          verified: z.literal(false),
          layoutType: z.enum(["traditional","multiplex","large-format","studio","recliner"]).optional(),
          stage:z.object({width:z.number().min(6).max(50),height:z.number().min(.15).max(1),depth:z.number().min(.5).max(3)}).optional(),
          presentation: z.object({ceilingStyle:z.enum(["coffered","linear","plain"]).optional(),curtains:z.boolean().optional(),curtainColor:color.optional(),wallColor:color.optional(),floorColor:color.optional(),lightColor:color.optional()}).optional(),
          aisleWidth:z.number().min(1).max(3).optional(),
          curvature:z.number().min(0).max(.4).optional(),
          stagger:z.number().min(0).max(.25).optional(),
          seatClasses:z.array(z.object({id:z.string().regex(/^[a-z0-9-]+$/),name:z.string().min(1).max(50),description:z.string().max(150),price:z.number().int().min(160).max(5000),color})).max(12).optional(),
          rowConfig:z.array(z.object({label:z.string().regex(/^[A-Z]{1,4}$/).optional(),category:z.string().regex(/^[a-z0-9-]+$/).optional(),omitted:z.array(z.number().int().min(1).max(30)).optional(),accessible:z.array(z.number().int().min(1).max(30)).optional(),blocked:z.array(z.number().int().min(1).max(30)).optional()})).max(20).optional(),
          modelUrl: z.string().url().startsWith("https://").optional(),
          seatMap: z.record(z.string()).optional(),
        })
.superRefine((b,ctx)=>{
 const fail=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
 const seats=makeSeats(b);
 if(b.balcony && (b.balconyRows??3)>=b.rows) fail("Balcony rows must leave a ground-floor section.");
 if(b.stage && b.stage.width>b.width-1) fail("Stage must fit inside the room.");
 if(new Set(seats.map(s=>s.id)).size!==seats.length) fail("Seat IDs must be unique across rows and levels.");
 if(b.rowLengths?.length && (b.rowLengths.length!==b.rows || b.rowLengths.some(n=>n>b.columns))) fail("Row lengths must match the configured row count and columns.");
 if(b.rowConfig && b.rowConfig.length>b.rows) fail("Too many row overrides.");
 for(const [row,config] of (b.rowConfig??[]).entries()) {
  const length=b.rowLengths?.[row]??b.columns;
  for(const key of ["omitted","accessible","blocked"] as const) {
   const numbers=config[key]??[];
   if(new Set(numbers).size!==numbers.length || numbers.some(n=>n>length)) fail("Row overrides must contain unique existing seat numbers.");
  }
  if(config.omitted?.some(n=>config.accessible?.includes(n)||config.blocked?.includes(n))) fail("An omitted seat cannot also be accessible or blocked.");
 }
 const classes=[...categories,...(b.seatClasses??[])];
 if(seats.some(s=>!classes.some(c=>c.id===s.category))) fail("Every seat category must be defined.");
 if(b.seatClasses && new Set(b.seatClasses.map(c=>c.id)).size!==b.seatClasses.length) fail("Duplicate seat classes.");
 if(new Set(b.aisles).size!==b.aisles.length || b.aisles.some(a=>a>=b.columns)) fail("Aisles must be unique and inside the row.");
 if(seats.some(s=>Math.abs(s.x)+.6>b.width/2 || s.z+1>b.depth/2 || s.y+1.7>b.height)) fail("Seats must fit inside the room.");
});
