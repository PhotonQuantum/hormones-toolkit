import levenshtein from "js-levenshtein";
import {Err, Ok, Option} from "./result";
import {alt, andThen, exact, map, maybe, Output, Parser, regex, tuple2, tuple3} from "./parsec";

type HormoneType = "FSH" | "LH" | "E2" | "P" | "T" | "PRL";
type MatterUnit = "IU" | "g" | "mol";
type VolumeUnit = "L";
type UnitModifier = "m" | "n" | "p" | "d" | "";

interface Display {
    display: () => string;
}

class ConcreteMatterUnit implements Display {
    modifier: UnitModifier;
    unit: MatterUnit;

    constructor(modifier: UnitModifier, unit: MatterUnit) {
        this.modifier = modifier;
        this.unit = unit;
    }

    display(): string {
        return this.modifier + this.unit;
    }
}

class ConcreteVolumeUnit implements Display {
    modifier: UnitModifier;
    unit: VolumeUnit;

    constructor(modifier: UnitModifier, unit: VolumeUnit) {
        this.modifier = modifier;
        this.unit = unit;
    }

    display(): string {
        return this.modifier + this.unit;
    }
}

class ProjField {
    accepted_names: Array<string>;
    max_dist: number;

    constructor(accepted_names: Array<string>, max_dist: number) {
        this.accepted_names = accepted_names;
        this.max_dist = max_dist;
    }
}

const HormoneTypeProj = new Map<HormoneType, ProjField>([
    ["FSH", new ProjField(["卵泡刺激素", "促卵泡生成素", "促卵泡生成激素"], 1)],
    ["LH", new ProjField(["黄体生成素", "促黄体生成素", "促黄体生成激素"], 1)],
    ["E2", new ProjField(["雌二醇", "二醇"], 0)],  // fault tolerant achieved by manual manipulation due to its similarity to T
    ["P", new ProjField(["孕酮"], 0)],
    ["T", new ProjField(["睾酮"], 0)],  // often hard to detect
    ["PRL", new ProjField(["泌乳素", "催乳素", "催乳激素", "垂体泌乳素", "垂体催乳素"], 1)]
]);

const MatterUnitProj = new Map<MatterUnit, string[]>([
    ["mol", ["mol", "ml", "mo"]],
    ["IU", ["IU", "lU", "lIU", "IlU"]],
    ["g", ["g"]]
]);

export class HormoneUnit implements Display {
    matterUnit: ConcreteMatterUnit;
    volumeUnit: ConcreteVolumeUnit;

    constructor(matterUnit: ConcreteMatterUnit, volumeUnit: ConcreteVolumeUnit) {
        this.matterUnit = matterUnit;
        this.volumeUnit = volumeUnit;
    }

    display() {
        return this.matterUnit.display() + "/" + this.volumeUnit.display()
    }
}

export type OutRangeType = ">" | "<";

export class HormoneValue implements Display {
    outrange: OutRangeType | null;
    val: number

    constructor(val: number, outrange: OutRangeType | null = null) {
        this.val = val;
        this.outrange = outrange;
    }

    display(): string {
        if (this.outrange === null) {
            return this.val.toString();
        }
        return this.outrange + this.val.toString();
    }
}

export class HormoneEntry implements Display {
    name: HormoneType;
    value: HormoneValue;
    unit: HormoneUnit;

    constructor(name: HormoneType, value: HormoneValue, unit: HormoneUnit) {
        this.name = name;
        this.value = value;
        this.unit = unit;
    }

    display(): string {
        return this.name + " " + this.value.display() + this.unit.display();
    }
}

export class PartialHormoneEntry implements Display {
    name: Option<HormoneType>;
    value: HormoneValue;
    unit: Option<HormoneUnit>;

    constructor(name: Option<HormoneType>, value: HormoneValue, unit: Option<HormoneUnit>) {
        this.name = name;
        this.value = value;
        this.unit = unit;
    }

    display(): string {
        return this.name.unwrap_or("Unknown") + " " + this.value.display() + this.unit.unwrap_or("Unknown");
    }
}

// NOTE this parser ignores empty modifier
// NOTE and what's wrong if I DO NOT return a variant in a enum??
// @ts-ignore
const parseModifier: Parser<UnitModifier> = input => {
    if (input[0] === "m" || input[0] === "n" || input[0] === "p" || input[0] === "d") {
        return new Ok(new Output(input.substring(1), input[0]));
    }
    return new Err(new Output(input, null));
};

const parseMatterUnit: Parser<MatterUnit> = input => {
    for (const [ty, candidates] of Array.from(MatterUnitProj)) {
        for (const candidate of candidates) {
            if (input.startsWith(candidate)) {
                return new Ok(new Output(input.substring(candidate.length), ty));
            }
        }
    }
    return new Err(new Output(input, null));
}

const parseVolumeUnit: Parser<VolumeUnit> = input => {
    if (input[0] === "I" || input[0] === "l" || input[0] === "L") {
        return new Ok(new Output(input.substring(1), "L"));
    }
    return new Err(new Output(input, null));
}

const guessFloat = (value: string): number => {
    if (value.includes(".")) {
        return parseFloat(value);
    } else {
        return parseInt(value) / 100;
    }
}

const parseValueImpl = (value: string): HormoneValue => {
    const valuePrefix = value[0];
    if (valuePrefix === ">" || valuePrefix === "<") {
        return new HormoneValue(guessFloat(value.substring(1)), valuePrefix);
    }
    return new HormoneValue(guessFloat(value));
}

const parseNameImpl = (potentialName: string): Option<HormoneType> => {
    for (const [ty, proj] of Array.from(HormoneTypeProj)) {
        for (const candidate of proj.accepted_names) {
            if (levenshtein(potentialName, candidate) <= proj.max_dist) {
                return new Ok(ty);
            }
        }
    }
    return new Err(null);
}

const reName = /^[睾酮孕雌二醇促卵泡刺激生成素黄体垂泌乳]+/;
const reValue = /[><]?[\d]+\.?[\d]*/;
const reNotUnit = /^[^pnmolgIUdL]*/;

const parseName = andThen(regex(reName), parseNameImpl);
const parseValue = map(regex(reValue), parseValueImpl);
const parseConcreteVolumeUnit = map(tuple2(maybe(parseModifier), parseVolumeUnit),
    ([mod, unit]): ConcreteVolumeUnit => {
        if (mod.isOk()) {
            return new ConcreteVolumeUnit(mod.unwrap(), unit);
        } else {
            return new ConcreteVolumeUnit("", unit);
        }
    });
const parseUnit = map(
    alt([
        tuple3(map(tuple2(parseModifier, parseMatterUnit),
                ([mod, unit]): ConcreteMatterUnit => new ConcreteMatterUnit(mod, unit)),
            maybe(exact("/")),
            parseConcreteVolumeUnit
        ),
        tuple3(map(parseMatterUnit, (unit): ConcreteMatterUnit => new ConcreteMatterUnit("", unit)),
            maybe(exact("/")),
            parseConcreteVolumeUnit
        )
    ]),
    ([matter, _, volume]) =>
        new HormoneUnit(matter, volume));
const parser = andThen(tuple3(maybe(parseName), parseValue, tuple2(regex(reNotUnit), maybe(parseUnit))),
    ([name, value, [_, unit]]) => {
        if (name.isOk() || unit.isOk()) {
            return new Ok(new PartialHormoneEntry(name, value, unit)) as Option<PartialHormoneEntry>;
        } else {
            return new Err(null) as Option<PartialHormoneEntry>;
        }
    }
);

export const parseLine = (line: string): Option<PartialHormoneEntry> => {
    return parser(line)
        .map(res => res.value)
        .mapErr(_ => null);
};
