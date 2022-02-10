declare function InternalBinding(binding: 'ffi'): {
  struct(name: string, members: object): any;
  pointer(type: any): any;
  load(filename: string, functions: any[]): object;
};
