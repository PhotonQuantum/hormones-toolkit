import {Err, Ok, Option, Result} from "./result";

export class Output<T> {
    remaining: string;
    value: T;

    constructor(remaining: string, value: T) {
        this.remaining = remaining;
        this.value = value;
    }
}

export type Parser<T> = (input: string) => Result<Output<T>, Output<null>>;

export const map = <T, U>(parser: Parser<T>, f: (t: T) => U): Parser<U> => {
    return input => {
        return parser(input)
            .map(({remaining, value}) => new Output(remaining, f(value)));
    }
}

export const andThen = <T, U>(parser: Parser<T>, f: (t: T) => Option<U>): Parser<U> => {
    return input => {
        return parser(input)
            .andThen(({remaining, value}) => {
                return f(value)
                    .map(result => new Output(remaining, result))
                    .mapErr(err => new Output(remaining, err));
            });
    };
}

// NOTE oh shit i just can't convince tsc so i bail out here.
export const maybe = <T>(parser: Parser<T>): Parser<Option<T>> => {
// @ts-ignore
    return input => {
        return parser(input)
            .map(({remaining, value}) => new Output(remaining, new Ok(value)))
            // @ts-ignore
            .orElse(({remaining}) => new Ok(new Output(remaining, new Err(null))))
    }
}

export const alt = <T>(ps: Parser<T>[]): Parser<T> => {
    return input => {
        for (const p of ps) {
            const res = p(input);
            if (res.isOk()) {
                return new Ok(res.unwrap());
            }
        }
        return new Err(new Output(input, null));
    }
}

export const exact = (s: string): Parser<string> => {
    return input => {
        if (!input.startsWith(s)) {
            return new Err(new Output(input, null));
        }
        return new Ok(new Output(input.substring(s.length), s));
    }
}

// NOTE this parser may skip prefix chars!
export const regex = (re: RegExp): Parser<string> => {
    return input => {
        const maybeList = input.match(re);
        if (maybeList === null || maybeList.index === undefined) {
            return new Err(new Output(input, null));
        }
        const remaining = input.substring(maybeList.index + maybeList[0].length);
        return new Ok(new Output(remaining, maybeList[0]));
    };
}

export const tuple2 = <T, U>(p1: Parser<T>, p2: Parser<U>): Parser<[T, U]> => {
    return input =>
        p1(input)
            .andThen(({remaining: remaining1, value: res1}) =>
                p2(remaining1)
                    .map(({remaining: remaining2, value: res2}) =>
                        new Output(remaining2, [res1, res2])
                    )
            );
}

export const tuple3 = <T, U, V>(p1: Parser<T>, p2: Parser<U>, p3: Parser<V>): Parser<[T, U, V]> => {
    return input =>
        p1(input)
            .andThen(({remaining: remaining1, value: res1}) =>
                p2(remaining1)
                    .andThen(({remaining: remaining2, value: res2}) =>
                        p3(remaining2).map(({remaining: remaining3, value: res3}) =>
                            new Output(remaining3, [res1, res2, res3])
                        )
                    )
            );
}
