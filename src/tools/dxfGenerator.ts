import { SpacePlan } from "../types.js";

export function generateDXF(spacePlan: SpacePlan): string {
  const drawing = spacePlan.drawing;
  if (!drawing) {
    return generatePlaceholderDXF(spacePlan);
  }

  const lines: string[] = [];
  lines.push("0");
  lines.push("SECTION");
  lines.push("2");
  lines.push("HEADER");
  lines.push("9");
  lines.push("$ACADVER");
  lines.push("1");
  lines.push("AC1015");
  lines.push("0");
  lines.push("ENDSEC");

  lines.push("0");
  lines.push("SECTION");
  lines.push("2");
  lines.push("TABLES");
  lines.push("0");
  lines.push("ENDSEC");

  lines.push("0");
  lines.push("SECTION");
  lines.push("2");
  lines.push("BLOCKS");
  
  const doorWidth = (drawing.doors && drawing.doors[0]?.width) || 1;
  const doorHeight = (drawing.doors && drawing.doors[0]?.height) || 0.1;
  const windowWidth = (drawing.windows && drawing.windows[0]?.width) || 1;
  const windowHeight = (drawing.windows && drawing.windows[0]?.height) || 0.1;
  
  if (drawing.doors && drawing.doors.length > 0) {
    lines.push(...generateDoorBlock("DOOR", doorWidth, doorHeight));
  }
  if (drawing.windows && drawing.windows.length > 0) {
    lines.push(...generateWindowBlock("WINDOW", windowWidth, windowHeight));
  }
  
  lines.push("0");
  lines.push("ENDSEC");

  lines.push("0");
  lines.push("SECTION");
  lines.push("2");
  lines.push("ENTITIES");

  const walls = drawing.walls && drawing.walls.length > 0 ? drawing.walls : generateWallsFromRooms(drawing.rooms || []);
  if (walls.length > 0) {
    walls.forEach((wall) => {
      lines.push("0");
      lines.push("LINE");
      lines.push("8");
      lines.push("Walls");
      lines.push("62");
      lines.push("7");
      lines.push("6");
      lines.push("Continuous");
      lines.push("10");
      lines.push(String(wall.x1));
      lines.push("20");
      lines.push(String(wall.y1));
      lines.push("30");
      lines.push("0");
      lines.push("11");
      lines.push(String(wall.x2));
      lines.push("21");
      lines.push(String(wall.y2));
      lines.push("31");
      lines.push("0");
    });
  }

  if (drawing.rooms && drawing.rooms.length > 0) {
    drawing.rooms.forEach((room) => {
      const cx = room.x + room.width / 2;
      const cy = room.y + room.height / 2;
      lines.push("0");
      lines.push("TEXT");
      lines.push("8");
      lines.push("Rooms");
      lines.push("10");
      lines.push(String(cx));
      lines.push("20");
      lines.push(String(cy));
      lines.push("30");
      lines.push("0");
      lines.push("40");
      lines.push("0.3");
      lines.push("1");
      lines.push(escapeDxfText(room.name));
    });
  }

  if (drawing.doors && drawing.doors.length > 0) {
    drawing.doors.forEach((door) => {
      lines.push("0");
      lines.push("INSERT");
      lines.push("8");
      lines.push("Doors");
      lines.push("2");
      lines.push("DOOR");
      lines.push("10");
      lines.push(String(door.x));
      lines.push("20");
      lines.push(String(door.y));
      lines.push("30");
      lines.push("0");
      lines.push("50");
      lines.push(String(door.rotation || 0));
    });
  }

  if (drawing.windows && drawing.windows.length > 0) {
    drawing.windows.forEach((win) => {
      lines.push("0");
      lines.push("INSERT");
      lines.push("8");
      lines.push("Windows");
      lines.push("2");
      lines.push("WINDOW");
      lines.push("10");
      lines.push(String(win.x));
      lines.push("20");
      lines.push(String(win.y));
      lines.push("30");
      lines.push("0");
    });
  }

  if (drawing.dimensions && drawing.dimensions.length > 0) {
    drawing.dimensions.forEach((dim) => {
      lines.push("0");
      lines.push("LINE");
      lines.push("8");
      lines.push("Dimensions");
      lines.push("62");
      lines.push("3");
      lines.push("10");
      lines.push(String(dim.x1));
      lines.push("20");
      lines.push(String(dim.y1));
      lines.push("30");
      lines.push("0");
      lines.push("11");
      lines.push(String(dim.x2));
      lines.push("21");
      lines.push(String(dim.y2));
      lines.push("31");
      lines.push("0");
    });
  }

  lines.push("0");
  lines.push("ENDSEC");
  lines.push("0");
  lines.push("EOF");

  return lines.join("\n");
}

function generateWallsFromRooms(rooms: Array<{ x: number; y: number; width: number; height: number }>): Array<{ x1: number; y1: number; x2: number; y2: number; thickness: number }> {
  const walls: Array<{ x1: number; y1: number; x2: number; y2: number; thickness: number }> = [];
  rooms.forEach((room) => {
    const x1 = room.x;
    const y1 = room.y;
    const x2 = room.x + room.width;
    const y2 = room.y + room.height;
    walls.push({ x1, y1, x2, y2: y1, thickness: 0.2 });
    walls.push({ x1, y1: y2, x2, y2, thickness: 0.2 });
    walls.push({ x1, y1, x2: x1, y2, thickness: 0.2 });
    walls.push({ x1: x2, y1, x2, y2, thickness: 0.2 });
  });
  return walls;
}

function generateDoorBlock(name: string, width: number, height: number): string[] {
  const lines: string[] = [];
  lines.push("0");
  lines.push("BLOCK");
  lines.push("8");
  lines.push("0");
  lines.push("2");
  lines.push(name);
  lines.push("10");
  lines.push("0");
  lines.push("20");
  lines.push("0");
  lines.push("30");
  lines.push("0");
  lines.push("3");
  lines.push(name);

  lines.push("0");
  lines.push("LINE");
  lines.push("8");
  lines.push("0");
  lines.push("10");
  lines.push("0");
  lines.push("20");
  lines.push("0");
  lines.push("30");
  lines.push("0");
  lines.push("11");
  lines.push(String(width));
  lines.push("21");
  lines.push("0");
  lines.push("31");
  lines.push("0");

  lines.push("0");
  lines.push("ENDBLK");
  return lines;
}

function generateWindowBlock(name: string, width: number, height: number): string[] {
  const lines: string[] = [];
  lines.push("0");
  lines.push("BLOCK");
  lines.push("8");
  lines.push("0");
  lines.push("2");
  lines.push(name);
  lines.push("10");
  lines.push("0");
  lines.push("20");
  lines.push("0");
  lines.push("30");
  lines.push("0");
  lines.push("3");
  lines.push(name);

  lines.push("0");
  lines.push("LINE");
  lines.push("8");
  lines.push("0");
  lines.push("10");
  lines.push("0");
  lines.push("20");
  lines.push(String(height / 2));
  lines.push("30");
  lines.push("0");
  lines.push("11");
  lines.push(String(width));
  lines.push("21");
  lines.push(String(height / 2));
  lines.push("31");
  lines.push("0");

  lines.push("0");
  lines.push("ENDBLK");
  return lines;
}

function generatePlaceholderDXF(spacePlan: SpacePlan): string {
  const lines: string[] = [];
  lines.push("0");
  lines.push("SECTION");
  lines.push("2");
  lines.push("HEADER");
  lines.push("9");
  lines.push("$ACADVER");
  lines.push("1");
  lines.push("AC1015");
  lines.push("0");
  lines.push("ENDSEC");

  lines.push("0");
  lines.push("SECTION");
  lines.push("2");
  lines.push("ENTITIES");
  lines.push("0");
  lines.push("TEXT");
  lines.push("8");
  lines.push("Notes");
  lines.push("10");
  lines.push("0");
  lines.push("20");
  lines.push("0");
  lines.push("30");
  lines.push("0");
  lines.push("40");
  lines.push("0.5");
  lines.push("1");
  lines.push(escapeDxfText("Drawing data not available. Generate a space plan first."));
  lines.push("0");
  lines.push("ENDSEC");
  lines.push("0");
  lines.push("EOF");

  return lines.join("\n");
}

function escapeDxfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\P");
}
