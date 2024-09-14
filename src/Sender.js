import React, { useState } from "react";

const ChunkUpload = () => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const chunkSize = 20 * 1024 * 1024; // 1 MB per chunk
  const parallelLimit = 20; // Limit to 5 parallel chunk uploads

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Helper function to delay execution (optional)
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Function to check already uploaded chunks
  const checkUploadedChunks = async (fileName, totalChunks) => {
    const response = await fetch("http://167.71.232.234:4000/upload/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, totalChunks }),
    });
    const data = await response.json();
    return data.uploadedChunks;
  };

  const uploadChunk = async (chunk, fileName, chunkIndex, totalChunks) => {
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("fileName", fileName);
    formData.append("chunkIndex", chunkIndex);
    formData.append("totalChunks", totalChunks);

    const response = await fetch("http://167.71.232.234:4000/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error uploading chunk ${chunkIndex + 1}`);
    }

    return chunkIndex;
  };

  const uploadFile = async () => {
    if (!file) return;

    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadedChunks = await checkUploadedChunks(file.name, totalChunks);

    let uploadedCount = uploadedChunks.length;
    let chunkIndex = 0;
    let offset = 0;

    const uploadNextBatch = async () => {
      const chunkUploadPromises = [];

      // Upload up to `parallelLimit` chunks in parallel
      while (
        chunkUploadPromises.length < parallelLimit &&
        chunkIndex < totalChunks
      ) {
        // Skip already uploaded chunks
        if (uploadedChunks.includes(chunkIndex)) {
          chunkIndex++;
          continue;
        }

        const chunk = file.slice(offset, offset + chunkSize);
        chunkUploadPromises.push(
          uploadChunk(chunk, file.name, chunkIndex, totalChunks)
            .then(() => {
              uploadedCount++;
              setProgress(Math.round((uploadedCount / totalChunks) * 100));
              console.log(
                `Chunk ${chunkIndex + 1} of ${totalChunks} uploaded.`
              );
            })
            .catch((error) => {
              console.error(`Error uploading chunk ${chunkIndex + 1}:`, error);
            })
        );

        chunkIndex++;
        offset += chunkSize;
      }

      // Wait for the current batch of uploads to finish
      await Promise.all(chunkUploadPromises);

      // If there are more chunks to upload, upload the next batch
      if (chunkIndex < totalChunks) {
        await delay(100); // Optional delay between batches
        await uploadNextBatch();
      }
    };

    // Start uploading chunks in batches
    await uploadNextBatch();

    console.log("File upload completed!");
  };

  return (
    <div>
      <h1>Chunk File Upload</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={uploadFile} disabled={!file}>
        Upload File
      </button>
      {progress > 0 && <p>Progress: {progress}%</p>}
    </div>
  );
};

export default ChunkUpload;
