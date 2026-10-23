class_name SaveSystem
extends RefCounted

const VERSION := 1

## A complete previous save survives interrupted writes and malformed JSON.
static func save_data(save_path: String, data: Dictionary) -> bool:
	var absolute := ProjectSettings.globalize_path(save_path)
	if DirAccess.make_dir_recursive_absolute(absolute.get_base_dir()) != OK:
		return false
	var temporary := absolute + ".tmp"
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(data, "\t"))
	file.flush()
	var write_error := file.get_error()
	file.close()
	if write_error != OK:
		return false
	if FileAccess.file_exists(absolute):
		if DirAccess.copy_absolute(absolute, absolute + ".bak") != OK:
			return false
		if DirAccess.remove_absolute(absolute) != OK:
			return false
	if DirAccess.rename_absolute(temporary, absolute) != OK:
		if FileAccess.file_exists(absolute + ".bak"):
			DirAccess.copy_absolute(absolute + ".bak", absolute)
		return false
	return true

static func load_data(save_path: String) -> Dictionary:
	var primary := _read_valid_json(save_path)
	if not primary.is_empty():
		return primary
	return _read_valid_json(save_path + ".bak")

static func _read_valid_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null or file.get_length() > 4 * 1024 * 1024:
		return {}
	var parser := JSON.new()
	if parser.parse(file.get_as_text()) != OK or not parser.data is Dictionary:
		return {}
	var data: Dictionary = parser.data
	var version_value: Variant = data.get("version")
	if not (version_value is int or version_value is float):
		return {}
	if not is_finite(float(version_value)) or float(version_value) != float(VERSION):
		return {}
	return data
