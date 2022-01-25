export function scan(code) {
    let tokens = [];

    for (let offset = 0, line = 1; offset < code.length; offset++) {
        let c = code[offset];

        if (c == ' ' || c == '\t' || c == '\r') {
            // Skip it
        } else if (c == '\n') {
            line++;
            tokens.push(token(line, 'end_of_line'));
        } else if (c == '#') {
            while (offset < code.length && code[offset] != '\n')
                offset++;
            line++;
        } else if (c >= '0' && c <= '9') {
            let end = offset + 1;
            while (code[end] >= '0' && code[end] <= '9')
                end++;

            let frag = code.substring(offset, end);
            let n = parseInt(frag, 10);

            tokens.push(token(line, 'number', n));

            offset = end - 1;
        } else if (c == '"') {
            let end = offset + 1;
            while (code[end] != '"') {
                if (code[end] == '\n') {
                    error(line, 'Unfinished string literal');
                    line++;
                }
                if (end >= code.length)
                    error(line, 'Unfinished string literal');

                end++;
            }

            let frag = code.substring(offset + 1, end);
            tokens.push(token(line, 'string', frag));

            offset = end;
        } else if (c == '<' && code[offset + 1] == '=') {
            tokens.push(token(line, '<='));
        } else if (c == '>' && code[offset + 1] == '=') {
            tokens.push(token(line, '>='));
        } else if (c == '=' ||
                   c == '+' ||
                   c == '-' ||
                   c == '*' ||
                   c == '/' ||
                   c == '<' ||
                   c == '>' ||
                   c == '[' ||
                   c == ']' ||
                   c == '(' ||
                   c == ')' ||
                   c == ',') {
            tokens.push(token(line, c));
        } else if ((c >= 'a' && c <= 'z') ||
                   (c >= 'A' && c <= 'Z') ||
                   c == '_') {
            let end = offset + 1;
            while ((code[end] >= 'a' && code[end] <= 'z') ||
                   (code[end] >= 'A' && code[end] <= 'Z') ||
                   (code[end] >= '0' && code[end] <= '9') ||
                   code[end] == '_')
                end++;

            let frag = code.substring(offset, end);

            if (frag == 'if' ||
                    frag == 'else' ||
                    frag == 'elif' ||
                    frag == 'end' ||
                    frag == 'or' ||
                    frag == 'and' ||
                    frag == 'for' ||
                    frag == 'in' ||
                    frag == 'print' ||
                    frag == 'func') {
                tokens.push(token(line, frag));
            } else {
                tokens.push(token(line, 'identifier', frag));
            }

            offset = end - 1;
        } else {
            error(line, `Unsupported character "${c}"`);
        }
    }

    return tokens;
}

// Utility

function token(line, type, value) {
    if (value != null) {
        return { line: line, type: type, value: value };
    } else {
        return { line: line, type: type };
    }
}

function error(line, message) {
    let str = `Line ${line}: ${message}`;
    throw new Error(str);
}
