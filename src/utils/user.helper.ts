import { UserRecord } from "../model/user.model";

type PublicUser = {
  id: unknown;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRecord["role"];
  bio: string;
  avatar: UserRecord["avatar"];
  isBlocked: boolean;
};

export const publicUser = (user: {
  _id: unknown;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRecord["role"];
  bio?: string;
  avatar: UserRecord["avatar"];
  isBlocked?: boolean;
}): PublicUser => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  bio: user.bio ?? "",
  avatar: user.avatar,
  isBlocked: Boolean(user.isBlocked),
});
