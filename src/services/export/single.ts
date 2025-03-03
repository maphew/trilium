"use strict";

import mimeTypes from "mime-types";
import html from "html";
import { getContentDisposition, escapeHtml } from "../utils.js";
import mdService from "./md.js";
import becca from "../../becca/becca.js";
import type TaskContext from "../task_context.js";
import type BBranch from "../../becca/entities/bbranch.js";
import type { Response } from "express";

function exportSingleNote(taskContext: TaskContext, branch: BBranch, format: "html" | "markdown", res: Response) {
    const note = branch.getNote();

    if (note.type === "image" || note.type === "file") {
        return [400, `Note type '${note.type}' cannot be exported as single file.`];
    }

    if (format !== "html" && format !== "markdown") {
        return [400, `Unrecognized format '${format}'`];
    }

    let payload, extension, mime;

    let content = note.getContent();
    if (typeof content !== "string") {
        throw new Error("Unsupported content type for export.");
    }

    if (note.type === "text") {
        if (format === "html") {
            content = inlineAttachments(content);

            if (!content.toLowerCase().includes("<html")) {
                content = `<html><head><meta charset="utf-8"></head><body>${content}</body></html>`;
            }

            payload = content.length < 100_000 ? html.prettyPrint(content, { indent_size: 2 }) : content;

            extension = "html";
            mime = "text/html";
        } else if (format === "markdown") {
            payload = mdService.toMarkdown(content);
            extension = "md";
            mime = "text/x-markdown";
        }
    } else if (note.type === "code") {
        payload = content;
        extension = mimeTypes.extension(note.mime) || "code";
        mime = note.mime;
    } else if (note.type === "relationMap" || note.type === "canvas" || note.type === "search") {
        payload = content;
        extension = "json";
        mime = "application/json";
    }

    const fileName = `${note.title}.${extension}`;

    res.setHeader("Content-Disposition", getContentDisposition(fileName));
    res.setHeader("Content-Type", `${mime}; charset=UTF-8`);

    res.send(payload);

    taskContext.increaseProgressCount();
    taskContext.taskSucceeded();
}

function inlineAttachments(content: string) {
    content = content.replace(/src="[^"]*api\/images\/([a-zA-Z0-9_]+)\/?[^"]+"/g, (match, noteId) => {
        const note = becca.getNote(noteId);
        if (!note || !note.mime.startsWith("image/")) {
            return match;
        }

        const imageContent = note.getContent();
        if (!Buffer.isBuffer(imageContent)) {
            return match;
        }

        const base64Content = imageContent.toString("base64");
        const srcValue = `data:${note.mime};base64,${base64Content}`;

        return `src="${srcValue}"`;
    });

    content = content.replace(/src="[^"]*api\/attachments\/([a-zA-Z0-9_]+)\/image\/?[^"]+"/g, (match, attachmentId) => {
        const attachment = becca.getAttachment(attachmentId);
        if (!attachment || !attachment.mime.startsWith("image/")) {
            return match;
        }

        const attachmentContent = attachment.getContent();
        if (!Buffer.isBuffer(attachmentContent)) {
            return match;
        }

        const base64Content = attachmentContent.toString("base64");
        const srcValue = `data:${attachment.mime};base64,${base64Content}`;

        return `src="${srcValue}"`;
    });

    content = content.replace(/href="[^"]*#root[^"]*attachmentId=([a-zA-Z0-9_]+)\/?"/g, (match, attachmentId) => {
        const attachment = becca.getAttachment(attachmentId);
        if (!attachment) {
            return match;
        }

        const attachmentContent = attachment.getContent();
        if (!Buffer.isBuffer(attachmentContent)) {
            return match;
        }

        const base64Content = attachmentContent.toString("base64");
        const hrefValue = `data:${attachment.mime};base64,${base64Content}`;

        return `href="${hrefValue}" download="${escapeHtml(attachment.title)}"`;
    });

    return content;
}

export default {
    exportSingleNote
};
