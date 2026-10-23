class_name SnapSystem
extends RefCounted

## Identical units and thresholds to the original TypeScript SnapSystem.
static func quaternion_angle(a: Quaternion, b: Quaternion) -> float:
	var norm := a.length() * b.length()
	if not is_finite(norm) or norm == 0.0:
		return INF
	return 2.0 * acos(clampf(absf(a.dot(b)) / norm, 0.0, 1.0))

static func can_snap(bone: Dictionary, position: Vector3, rotation: Quaternion, difficulty: String) -> bool:
	if not position.is_finite() or not rotation.is_finite():
		return false
	var target_position := _vector(bone.targetPosition)
	var target_rotation := _quaternion(bone.targetRotation)
	var multiplier := 1.0 if difficulty == "easy" else (0.5 if difficulty == "hard" else 0.75)
	var tolerance := float(bone.snapDistance) * multiplier
	if position.distance_to(target_position) > tolerance:
		return false
	return difficulty == "easy" or quaternion_angle(rotation, target_rotation) <= (0.16 if difficulty == "hard" else 0.35)

static func _vector(value: Array) -> Vector3:
	return Vector3(value[0], value[1], value[2])

static func _quaternion(value: Array) -> Quaternion:
	return Quaternion(value[0], value[1], value[2], value[3])
