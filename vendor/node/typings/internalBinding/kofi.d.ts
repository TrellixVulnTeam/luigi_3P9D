declare function InternalBinding(binding: 'kofi'): {
  struct(name: string, members: object): any;
  pointer(type: any): any;
  load(filename: string, functions: any[]): object;
};
