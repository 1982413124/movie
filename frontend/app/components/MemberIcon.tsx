import {
  ArrowRightStartOnRectangleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  FilmIcon,
  GiftIcon,
  PencilSquareIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

export type MemberIconName =
  | "calendar"
  | "check"
  | "film"
  | "gift"
  | "history"
  | "edit"
  | "logout"
  | "user";

const memberIcons = {
  calendar: CalendarDaysIcon,
  check: CheckCircleIcon,
  film: FilmIcon,
  gift: GiftIcon,
  history: ClockIcon,
  edit: PencilSquareIcon,
  logout: ArrowRightStartOnRectangleIcon,
  user: UserIcon,
} satisfies Record<MemberIconName, typeof UserIcon>;

export default function MemberIcon({
  className,
  name,
}: {
  className?: string;
  name: MemberIconName;
}) {
  const Icon = memberIcons[name];

  return <Icon aria-hidden="true" className={className} />;
}
