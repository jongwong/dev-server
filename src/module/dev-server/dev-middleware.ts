import { ExpressMiddlewareInterface } from "routing-controllers";

export class DevMiddleware implements ExpressMiddlewareInterface {
  use(req: any, res: any, next?: (err?: any) => any): any {
    const id = req.params.id;
    console.log(id);
    next();
  }
}
