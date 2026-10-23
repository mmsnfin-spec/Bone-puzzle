class_name BonePiece
extends Node3D
## A directly controlled anatomy piece. Only the small Area3D participates in
## picking; no dynamic physics body survives into the assembly phase.

var bone_id: String = ""
var definition: Dictionary
var placed: bool = false
var selected: bool = false
var area: Area3D
var visual: Node3D
var _normal_material: Material
var _selected_material: Material
var _placed_material: Material

func build(data: Dictionary, scene: PackedScene, normal_material: Material,
		selected_material: Material, placed_material: Material) -> void:
	definition = data
	bone_id = str(data.id)
	name = bone_id
	_normal_material = normal_material
	_selected_material = selected_material
	_placed_material = placed_material
	visual = scene.instantiate() as Node3D
	add_child(visual)
	_apply_material(visual, _normal_material)
	area = Area3D.new()
	area.name = "PickArea"
	area.collision_layer = 1
	area.collision_mask = 0
	area.set_meta("bone_id", bone_id)
	var collision := CollisionShape3D.new()
	var box := BoxShape3D.new()
	var dimensions: Array = data.get("size", [0.3, 0.3, 0.3])
	box.size = Vector3(maxf(float(dimensions[0]), 0.18),
		maxf(float(dimensions[1]), 0.18), maxf(float(dimensions[2]), 0.18))
	collision.shape = box
	area.add_child(collision)
	add_child(area)

func set_status(is_selected: bool, is_placed: bool) -> void:
	if selected == is_selected and placed == is_placed:
		return
	selected = is_selected
	placed = is_placed
	_apply_material(visual, _selected_material if selected else
		(_placed_material if placed else _normal_material))

func set_pickable(enabled: bool) -> void:
	area.collision_layer = 1 if enabled else 0

static func apply_material_to(node: Node, material: Material, shadows: bool = true) -> void:
	if node is MeshInstance3D:
		node.material_override = material
		node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadows else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for child in node.get_children():
		apply_material_to(child, material, shadows)

func _apply_material(node: Node, material: Material) -> void:
	apply_material_to(node, material)
