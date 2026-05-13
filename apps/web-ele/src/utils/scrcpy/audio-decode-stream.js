import { TransformStream } from '@yume-chan/stream-extra';

/**
 * AAC audio decode stream.
 * Decodes AAC audio packets to f32-planar Float32Array buffers
 * using the browser's WebCodecs AudioDecoder API.
 *
 * @extends TransformStream
 */
export class AacDecodeStream extends TransformStream {
  /**
   * @param {Object} config - Audio decoder configuration
   * @param {string} config.codec - The codec string (e.g. 'mp4a.40.2')
   * @param {number} config.numberOfChannels - Number of audio channels
   * @param {number} config.sampleRate - Sample rate in Hz
   * @param {Uint8Array} [config.description] - Optional codec description (for raw AAC)
   */
  constructor(config) {
    let decoder;
    super({
      start(controller) {
        decoder = new AudioDecoder({
          error(error) {
            console.log('audio decoder error: ', error);
            controller.error(error);
          },
          output(output) {
            controller.enqueue(
              Array.from({ length: 2 }, (_, i) => {
                const options = {
                  // AAC decodes to "f32-planar",
                  // converting to another format may cause audio glitches on Chrome.
                  format: 'f32-planar',
                  planeIndex: i,
                };
                const buffer = new Float32Array(
                  output.allocationSize(options) /
                    Float32Array.BYTES_PER_ELEMENT,
                );
                output.copyTo(buffer, options);
                return buffer;
              }),
            );
          },
        });
      },
      transform(chunk) {
        switch (chunk.type) {
          case 'configuration':
            // https://www.w3.org/TR/webcodecs-aac-codec-registration/#audiodecoderconfig-description
            // Raw AAC stream needs `description` to be set.
            decoder.configure({
              ...config,
              description: chunk.data,
            });
            break;
          case 'data':
            decoder.decode(
              new EncodedAudioChunk({
                data: chunk.data,
                type: 'key',
                timestamp: 0,
              }),
            );
        }
      },
      async flush() {
        await decoder.flush();
      },
    });
  }
}

/**
 * Opus audio decode stream.
 * Decodes Opus audio packets to f32 Float32Array buffers
 * using the browser's WebCodecs AudioDecoder API.
 *
 * @extends TransformStream
 */
export class OpusDecodeStream extends TransformStream {
  /**
   * @param {Object} config - Audio decoder configuration
   * @param {string} config.codec - The codec string (e.g. 'opus')
   * @param {number} config.numberOfChannels - Number of audio channels
   * @param {number} config.sampleRate - Sample rate in Hz
   */
  constructor(config) {
    let decoder;
    super({
      start(controller) {
        decoder = new AudioDecoder({
          error(error) {
            console.log('audio decoder error: ', error);
            controller.error(error);
          },
          output(output) {
            // Opus decodes to "f32",
            // converting to another format may cause audio glitches on Chrome.
            const options = {
              format: 'f32',
              planeIndex: 0,
            };
            const buffer = new Float32Array(
              output.allocationSize(options) /
                Float32Array.BYTES_PER_ELEMENT,
            );
            output.copyTo(buffer, options);
            controller.enqueue(buffer);
          },
        });
        decoder.configure(config);
      },
      transform(chunk) {
        switch (chunk.type) {
          case 'configuration':
            // configuration data is a opus-in-ogg identification header,
            // but stream data is raw opus,
            // so it has no use here.
            break;
          case 'data':
            if (chunk.data.length === 0) {
              break;
            }
            decoder.decode(
              new EncodedAudioChunk({
                type: 'key',
                timestamp: 0,
                data: chunk.data,
              }),
            );
        }
      },
      async flush() {
        await decoder.flush();
      },
    });
  }
}
