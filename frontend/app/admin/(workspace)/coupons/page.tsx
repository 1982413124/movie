import { requireAdmin } from "@/lib/cinema-server";
import CouponManager from "../../components/CouponManager";

export default async function CouponsPage() {
  const session = await requireAdmin();
  return <CouponManager session={session} />;
}
