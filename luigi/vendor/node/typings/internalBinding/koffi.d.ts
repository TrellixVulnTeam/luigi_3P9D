declare function InternalBinding(binding: 'koffi'): {
  struct(name: string, members: object): any;
  pointer(type: any): any;
  load(filename: string, functions: any[]): object;
};
