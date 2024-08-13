import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import NodeCache from "node-cache";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me",
  "https://www.googleapis.com/auth/classroom.coursework.students",
  "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/classroom.profile.emails",
  "https://www.googleapis.com/auth/classroom.profile.photos",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
];

const TOKEN_PATH = path.join(__dirname, "..", "config", "key.json");

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI,
  );
}

export const auth = async (req, res) => {
  const oAuth2Client = getOAuth2Client();
  const authorizeUrl: string = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  res.redirect(authorizeUrl);
};

export const oauth2callback = async (req, res) => {
  const code: string | string[] = req.query.code as string | string[];

  if (typeof code === "string") {
    try {
      const oAuth2Client = getOAuth2Client();
      const { tokens } = await oAuth2Client.getToken(code);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      oAuth2Client.setCredentials(tokens);
      res.send("Done :)");
    } catch (error) {
      console.error("failed", error);
      res.status(500).send("failed");
    }
  } else {
    res.status(400).send("Invalid authorization code");
  }
};

export const allCourses = async (req, res) => {
  try {
    const oAuth2Client = req["googleAuth"];
    const classroom = google.classroom({ version: "v1", auth: oAuth2Client });
    const response = await classroom.courses.list({
      pageSize: 10,
      fields: "courses(id,name,courseState),nextPageToken",
    });
    if (response.data && response.data.courses) {
      res.json(response.data.courses);
    } else {
      res.json({ message: "No courses found" });
    }
  } catch (error) {
    console.error("failed:", error);
    res.status(500).json({
      error: "failed",
      message: error.message,
    });
  }
};

export const getFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    const oAuth2Client = req["googleAuth"];

    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: "id, name, mimeType",
    });

    const fileContent = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "stream" },
    );

    res.setHeader("Content-Type", fileMetadata.data.mimeType);
    fileContent.data.pipe(res);
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).json({
      error: "Failed to fetch file",
      message: error.message,
    });
  }
};

export const getAssignments = async (req, res) => {
  const { classId } = req.params;

  try {
    const oAuth2Client = req["googleAuth"];
    const classroom = google.classroom({ version: "v1", auth: oAuth2Client });

    const coursesResponse = await classroom.courses.list({
      courseStates: ["ACTIVE"],
    });
    const courses = coursesResponse.data.courses.filter(
      (course) => course.section === classId,
    );

    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ error: "No courses found for the given classId" });
    }

    const assignmentsPromises = courses.map((course) =>
      classroom.courses.courseWork.list({
        courseId: course.id,
        pageSize: 10,
        fields:
          "courseWork(id,title,description,dueDate,dueTime,materials,alternateLink)",
      }),
    );

    const assignmentsResponses = await Promise.all(assignmentsPromises);

    const assignments = assignmentsResponses.flatMap(
      (response) => response.data.courseWork || [],
    );

    res.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({
      error: "Failed to fetch assignments",
      message: error.message,
    });
  }
};

const imageCache = new NodeCache({ stdTTL: 3600 });

export const getImage = async (req, res) => {
  const { thumbnailUrl } = req.query;

  if (!thumbnailUrl) {
    return res.status(400).json({ error: "Thumbnail URL is required" });
  }

  try {
    // Check if cache
    const cachedImage = imageCache.get(thumbnailUrl);
    if (cachedImage) {
      res.setHeader(
        "Content-Type",
        (cachedImage as { mimeType: string }).mimeType,
      );
      res.send((cachedImage as { data: any }).data);
      return;
    }

    const oAuth2Client = req["googleAuth"];
    if (!oAuth2Client) {
      throw new Error("OAuth2 client not found");
    }

    if (oAuth2Client.isTokenExpiring()) {
      await oAuth2Client.refreshAccessToken();
    }

    // Fetch image
    const response = await fetch(thumbnailUrl, {
      headers: {
        Authorization: `Bearer ${oAuth2Client.credentials.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    const imageBuffer = await response.buffer();

    // Cache image
    imageCache.set(thumbnailUrl, {
      mimeType: contentType,
      data: imageBuffer,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );

    res.setHeader("Content-Type", contentType);
    res.send(imageBuffer);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).json({
      error: "Failed to fetch image",
      message: error.message,
    });
  }
};
