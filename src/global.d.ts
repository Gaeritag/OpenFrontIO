// Declare modules for image and other file types
declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}

declare module "*.bin" {
  const value: string;
  export default value;
}

declare module "*.txt" {
  const value: string;
  export default value;
}

declare module "*.html" {
  const content: string;
  export default content;
}

// Declare module for JSON files
declare module "*.json" {
  const value: any;
  export default value;
}
import 'express-session';
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string;
      accessToken: string;
    };
  }
}

