export let library = {
    print: {
        name: 'print',
        params: ['value'],
        native: value => { console.log(value); }
    }
};
