import toastService from "./toast.js";

function copyImageReferenceToClipboard($imageWrapper) {
    try {
        $imageWrapper.attr('contenteditable', 'true');
        selectImage($imageWrapper.get(0));

        const success = document.execCommand('copy');

        if (success) {
            toastService.showMessage(t("image.copied-to-clipboard"));
        } else {
            toastService.showAndLogError(t("image.cannot-copy"));
        }
    }
    finally {
        window.getSelection().removeAllRanges();
        $imageWrapper.removeAttr('contenteditable');
    }
}

function selectImage(element) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}

export default {
    copyImageReferenceToClipboard
};
