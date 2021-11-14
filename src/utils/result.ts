export interface Result<T, E> {
    isOk: () => boolean;
    isErr: () => boolean;
    unwrap: () => T;
    unwrap_err: () => E;
    map: <T2>(f: ((t: T) => T2)) => Result<T2, E>;
    mapErr: <E2>(f: ((u: E) => E2)) => Result<T, E2>;
    andThen: <T2>(f: ((t: T) => Result<T2, E>)) => Result<T2, E>;
    orElse: <E2>(f: ((u: E) => Result<T, E2>)) => Result<T, E2>;
}

export class Ok<T, E> implements Result<T, E> {
    value: T

    constructor(value: T) {
        this.value = value;
    }

    _cast<U2>(): Ok<T, U2> {
        return new Ok(this.value);
    }

    isOk(): boolean {
        return true;
    }

    isErr(): boolean {
        return false;
    }

    map<T2>(f: (t: T) => T2): Result<T2, E> {
        return new Ok(f(this.value));
    }

    mapErr<U2>(_: (u: E) => U2): Result<T, U2> {
        return this._cast();
    }

    andThen<T2>(f: (t: T) => Result<T2, E>): Result<T2, E> {
        return f(this.value);
    }

    orElse<E2>(_: (u: E) => Result<T, E2>): Result<T, E2> {
        return this._cast();
    }

    unwrap(): T {
        return this.value;
    }

    unwrap_err(): E {
        // @ts-ignore
        return null;
    }
}

export class Err<T, E> implements Result<T, E> {
    err: E

    constructor(err: E) {
        this.err = err;
    }

    _cast<T2>(): Err<T2, E> {
        return new Err(this.err);
    }

    isOk(): boolean {
        return false;
    }

    isErr(): boolean {
        return true;
    }

    map<T2>(_: (t: T) => T2): Result<T2, E> {
        return this._cast();
    }

    mapErr<U2>(f: (u: E) => U2): Result<T, U2> {
        return new Err(f(this.err));
    }

    andThen<T2>(_: (t: T) => Result<T2, E>): Result<T2, E> {
        return this._cast();
    }

    orElse<E2>(f: (u: E) => Result<T, E2>): Result<T, E2> {
        return f(this.err);
    }

    unwrap(): T {
        // @ts-ignore
        return null;
    }

    unwrap_err(): E {
        return this.err;
    }
}

export type Option<T> = Result<T, null>;