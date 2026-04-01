interface TagProps {
  label: string;
  color?: "green" | "gray" | "blue" | "orange";
}

const styles = {
  green:  { backgroundColor: "#E6F9F1", color: "#05C072" },
  gray:   { backgroundColor: "#F0F4F0", color: "#6B7B6B" },
  blue:   { backgroundColor: "#E8F0FE", color: "#4285F4" },
  orange: { backgroundColor: "#FFF3E8", color: "#F07D05" },
};

export function Tag({ label, color = "gray" }: TagProps) {
  return (
    <span
      className="text-xs font-medium px-2 py-1 rounded-md"
      style={styles[color]}
    >
      {label}
    </span>
  );
}
