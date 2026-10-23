class_name NameValidation
extends RefCounted

static func normalize_name(value: String) -> String:
	var whitespace := RegEx.new()
	whitespace.compile("\\s+")
	return whitespace.sub(value.strip_edges().to_lower(), " ", true)

static func validate_name(value: String, bone: Dictionary) -> bool:
	var candidate := normalize_name(value)
	if candidate.is_empty():
		return false
	if candidate == normalize_name(str(bone.englishName)):
		return true
	for alias in bone.get("acceptedAliases", []):
		if candidate == normalize_name(str(alias)):
			return true
	return false
