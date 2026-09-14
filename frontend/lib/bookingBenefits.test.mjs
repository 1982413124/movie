import assert from "node:assert/strict";
import { test } from "node:test";
import { createReservation, quoteReservation } from "./reservationApi.mjs";
import { buildPurchaseCompletion } from "./purchaseCompletion.mjs";
import { normalizeReservationHistoryResponse } from "./purchaseHistoryApi.mjs";

const pricing = { reservation_id:8, order_num:"HAL-EXAMPLE", subtotal_amount:2320,coupon_code:"HAL500",coupon_discount_amount:500,
  points_used:20,points_earned:18,total_price:1800,ticket_total_price:1800,food_total_price:520,email_status:"queued" };

test("coupon and point request keeps expected payment separate from untrusted draft total", async () => {
  let body;
  const result=await createReservation({movieId:"m",screeningId:"s",seatIds:["A"],totalPrice:2320}, {
    couponCode:"HAL500",pointsToUse:20,expectedTotal:1800,
    fetchImpl:async(url,init) => url.endsWith("/session") ? {ok:true,json:async()=>({csrf_token:"test"})} : (body=JSON.parse(init.body),{ok:true,json:async()=>pricing}),
  });
  assert.equal(body.coupon_code,"HAL500"); assert.equal(body.points_to_use,20);assert.equal(body.expected_total,1800);
  assert.equal(result.pricing.total_price,1800);
});

test("point balance conflict is not misreported as a reserved seat",async()=>{
  const result=await createReservation({}, {fetchImpl:async url=>url.endsWith("/session") ? {ok:true,json:async()=>({csrf_token:"test"})} :
    {ok:false,status:409,json:async()=>({code:"insufficient_points",message:"残高不足"})}});
  assert.equal(result.conflict,false);assert.equal(result.code,"insufficient_points");assert.equal(result.message,"残高不足");
});

test("quote preserves server coupon errors for feedback",async()=>{
  await assert.rejects(quoteReservation({}, {couponCode:"OLD",fetchImpl:async url=>url.endsWith("/session") ? {ok:true,json:async()=>({csrf_token:"test"})} :
    {ok:false,status:400,json:async()=>({code:"expired_coupon",message:"期限切れ"})}}),error=>error.code==="expired_coupon" && error.message==="期限切れ");
});

test("completion and purchase history retain charged total, discount and point snapshots",()=>{
  const completion=buildPurchaseCompletion({totalPrice:99999},{pricing});
  assert.equal(completion.totalPrice,1800);assert.equal(completion.subtotalAmount,2320);assert.equal(completion.pointsUsed,20);
  const [history]=normalizeReservationHistoryResponse({reservations:[{...pricing,id:8,created_at:"2026-09-13T10:00:00Z"}]});
  assert.equal(history.totalPrice,1800);assert.equal(history.couponDiscountAmount,500);assert.equal(history.pointsEarned,18);
  assert.equal(history.orderNum,"HAL-EXAMPLE");
});
