// console.log("***js ok");

$(document).ready(function () {
    let selectedFiles = [];
    let isUploading = false;

    // 後端 API 路徑設定
    // const UPLOAD_API_URL = "/api/upload"; // 根據您的後端路徑調整
    // 修改為本地伺服器路徑
    // const UPLOAD_API_URL = "http://localhost:5000/api/upload";
    const UPLOAD_API_URL = "http://jzshome.ddns.net:5000/api/upload";


    // 點擊上傳區域觸發檔案選擇
    $("#upload-area").click(function () {
        if (!isUploading) {
            $("#file-input").click();
        }
    });

    // 檔案選擇事件
    $("#file-input").change(function (e) {
        handleFiles(e.target.files);
    });

    // 拖放事件
    $("#upload-area").on("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!isUploading) {
            $(this).addClass("dragover");
        }
    });

    $("#upload-area").on("dragleave", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass("dragover");
    });

    $("#upload-area").on("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass("dragover");

        if (!isUploading) {
            const files = e.originalEvent.dataTransfer.files;
            handleFiles(files);
        }
    });

    // 處理選擇的檔案
    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 檢查檔案大小（例如：限制 10MB）
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                showMessage('檔案 "' + file.name + '" 超過大小限制 (10MB)', "error");
                continue;
            }

            // 檢查是否已存在
            const exists = selectedFiles.some((f) => f.name === file.name && f.size === file.size);

            if (!exists) {
                selectedFiles.push(file);
                addFileToList(file);
            } else {
                showMessage('檔案 "' + file.name + '" 已存在', "error");
            }
        }

        console.log("已選擇檔案:", selectedFiles);
    }

    // 將檔案加入顯示列表
    function addFileToList(file) {
        const fileSize = formatFileSize(file.size);
        const fileId = "file-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

        const fileItem = $('<div class="file-item" data-file-id="' + fileId + '"></div>');

        const fileInfo = $('<div style="flex: 1;"></div>');
        fileInfo.html(
            "<strong>" +
            file.name +
            "</strong><br>" +
            "<small>大小: " +
            fileSize +
            " | 類型: " +
            (file.type || "未知") +
            "</small>" +
            '<div class="file-status" data-status="' +
            fileId +
            '"></div>' +
            '<div class="progress-bar" data-progress="' +
            fileId +
            '">' +
            '<div class="progress-fill">0%</div>' +
            "</div>"
        );

        const removeBtn = $('<button class="btn btn-danger">移除</button>');
        removeBtn.click(function () {
            if (!isUploading) {
                removeFile(fileId, file);
            }
        });

        fileItem.append(fileInfo);
        fileItem.append(removeBtn);
        $("#file-list").append(fileItem);

        // 儲存檔案 ID 到檔案物件
        file.fileId = fileId;
    }

    // 移除檔案
    function removeFile(fileId, file) {
        selectedFiles = selectedFiles.filter((f) => f.fileId !== fileId);
        $('[data-file-id="' + fileId + '"]').remove();
        showMessage("已移除檔案: " + file.name, "success");
    }

    // 清除所有檔案
    $("#clear-btn").click(function () {
        if (!isUploading) {
            selectedFiles = [];
            $("#file-list").empty();
            $("#file-input").val("");
            showMessage("已清除所有檔案", "success");
        }
    });

    // 上傳檔案到伺服器
    $("#upload-btn").click(function () {
        if (selectedFiles.length === 0) {
            showMessage("請先選擇檔案", "error");
            return;
        }

        if (isUploading) {
            showMessage("正在上傳中，請稍候...", "info");
            return;
        }

        uploadToServer();
    });

    // 上傳到伺服器
    function uploadToServer() {
        isUploading = true;
        $("#upload-btn").prop("disabled", true);

        const formData = new FormData();
        var uid = sessionStorage.getItem('account')
        // 將所有檔案加入 FormData
        selectedFiles.forEach(function (file) {
            formData.append("files", file);
        });

        // 可以加入額外的參數
        formData.append("uploadTime", new Date().toISOString());
        formData.append("totalFiles", selectedFiles.length);
        formData.append("account", uid);

        $.ajax({
            url: UPLOAD_API_URL,
            type: "POST",
            data: formData,
            processData: false, // 重要：不處理資料
            contentType: false, // 重要：不設定 content-type
            xhr: function () {
                const xhr = new window.XMLHttpRequest();

                // 上傳進度
                xhr.upload.addEventListener(
                    "progress",
                    function (e) {
                        if (e.lengthComputable) {
                            const percentComplete = Math.round((e.loaded / e.total) * 100);
                            updateOverallProgress(percentComplete);
                        }
                    },
                    false
                );

                return xhr;
            },
            beforeSend: function () {
                showMessage("開始上傳 " + selectedFiles.length + " 個檔案...", "info");
                selectedFiles.forEach(function (file) {
                    updateFileStatus(file.fileId, "準備上傳...", "uploading");
                });
            },
            success: function (response) {
                console.log("上傳成功:", response);
                showMessage("所有檔案上傳成功！", "success");

                // 更新每個檔案的狀態
                if (response.files && Array.isArray(response.files)) {
                    response.files.forEach(function (fileInfo) {
                        const file = selectedFiles.find((f) => f.name === fileInfo.originalName);
                        if (file) {
                            updateFileStatus(file.fileId, "上傳成功 - 儲存路徑: " + fileInfo.path, "success");
                            updateFileProgress(file.fileId, 100);
                        }
                    });
                } else {
                    selectedFiles.forEach(function (file) {
                        updateFileStatus(file.fileId, "上傳成功", "success");
                        updateFileProgress(file.fileId, 100);
                    });
                }

                // 上傳成功後可以選擇清除列表
                // setTimeout(function() {
                //     selectedFiles = [];
                //     $('#file-list').empty();
                //     $('#file-input').val('');
                // }, 3000);
            },
            error: function (xhr, status, error) {
                console.error("上傳失敗:", error);
                let errorMsg = "上傳失敗: ";

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg += xhr.responseJSON.message;
                } else if (xhr.responseText) {
                    errorMsg += xhr.responseText;
                } else {
                    errorMsg += error;
                }

                showMessage(errorMsg, "error");

                selectedFiles.forEach(function (file) {
                    updateFileStatus(file.fileId, "上傳失敗", "error");
                });
            },
            complete: function () {
                isUploading = false;
                $("#upload-btn").prop("disabled", false);
            },
        });
    }

    // 更新檔案狀態
    function updateFileStatus(fileId, message, statusClass) {
        const statusElement = $('[data-status="' + fileId + '"]');
        statusElement.text(message);
        statusElement.removeClass("uploading success error");
        statusElement.addClass(statusClass);
    }

    // 更新檔案上傳進度
    function updateFileProgress(fileId, percent) {
        const progressBar = $('[data-progress="' + fileId + '"]');
        progressBar.show();
        progressBar
            .find(".progress-fill")
            .css("width", percent + "%")
            .text(percent + "%");
    }

    // 更新整體進度
    function updateOverallProgress(percent) {
        selectedFiles.forEach(function (file) {
            updateFileProgress(file.fileId, percent);
        });
    }

    // 顯示訊息
    function showMessage(msg, type) {
        const messageDiv = $('<div class="message ' + type + '"></div>');
        messageDiv.text(msg);
        $("#message-area").prepend(messageDiv);

        // 5秒後自動移除訊息
        setTimeout(function () {
            messageDiv.fadeOut(function () {
                $(this).remove();
            });
        }, 5000);
    }

    // 格式化檔案大小
    function formatFileSize(bytes) {
        if (bytes === 0) return "0 Bytes";

        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    }
});