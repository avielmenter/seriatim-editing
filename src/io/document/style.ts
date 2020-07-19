// CSS UNITS

export type LengthUnit
	= "cm"
	| "mm"
	| "in"
	| "px"
	| "pt"
	| "pc"
	| "em"
	| "ex"
	| "ch"
	| "rem"
	| "vw"
	| "vh"
	| "vmin"
	| "vmax"
	| "%";

export const validateUnitType = (unit: string): unit is LengthUnit => unit == "cm"
	|| unit == "mm"
	|| unit == "in"
	|| unit == "px"
	|| unit == "pt"
	|| unit == "pc"
	|| unit == "em"
	|| unit == "ex"
	|| unit == "ch"
	|| unit == "rem"
	|| unit == "vw"
	|| unit == "vh"
	|| unit == "vmin"
	|| unit == "vmax"
	|| unit == "%";

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