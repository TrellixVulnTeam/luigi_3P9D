export let std = {
    print: {
        name: 'print',
        params: ['value'],
        native: value => { console.log(value); }
    }
};
