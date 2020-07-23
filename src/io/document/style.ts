// CSS UNITS

export const LengthUnits = [
	"cm",
	"mm",
	"in",
	"px",
	"pt",
	"pc",
	"em",
	"ex",
	"ch",
	"rem",
	"vw",
	"vh",
	"vmin",
	"vmax",
	"%"
] as const;

export type LengthUnit = typeof LengthUnits[number];

export const validateLengthUnit = (u: string): u is LengthUnit => LengthUnits.includes(u as LengthUnit);

// CSS PROPERTIES

export type BackgroundColor = {
	property: "backgroundColor",
	value: string
}

export type Color = {
	property: "color",
	value: string
}

export type FontSize = {
	property: "fontSize",
	value: number,
	unit: LengthUnit
}

export type LineHeight = {
	property: "lineHeight",
	value: number,
	unit: LengthUnit
};

type Style
	= BackgroundColor
	| Color
	| FontSize
	| LineHeight;

export function toValueString(style: Style): string {
	const unit = (style as any).unit;
	return style.value + (unit || "");
}

export default Style;