
import { IUserPayload } from "../services/auth.services";

declare global {
  namespace Express {
    interface Request {
      user: IUserPayload;
      

    }
  }
}
export{}
