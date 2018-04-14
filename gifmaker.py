from PIL import Image, ImageDraw, ImageFont
import imageio
import numpy
import os

VIDEO_DIRNAME = 'videos'
TMP_DIRNAME = 'tmp'
GIF_DIRNAME = 'gifs'


def make_captioned_gif(inpath, outpath, fps, caption, font, color):
    in_frames = imageio.mimread(inpath)
    out_frames = []
    for frame in in_frames:
        img = Image.fromarray(frame)
        draw = ImageDraw.Draw(img)
        textsize = draw.textsize(caption, font)
        imagesize = img.size
        w_offset = int((imagesize[0] - textsize[0]) / 2)
        h_offset = int(0.8 * imagesize[1])
        draw.text((w_offset, h_offset), caption, fill=color, font=font)
        out_frames.append(numpy.array(img))
    imageio.mimwrite(outpath, out_frames, fps=fps)


def mkdir_if_not_exists(dirlist):
    for dirname in dirlist:
        if not os.path.exists(dirname):
            os.makedirs(dirname)


def create_gif_from_youtube(videoid, start, duration, caption, font, color):
    # Check if we have already downloaded the video
    mkdir_if_not_exists([VIDEO_DIRNAME, TMP_DIRNAME, GIF_DIRNAME])

    video_exists = False
    if os.path.exists(VIDEO_DIRNAME):
        video_filenames = os.listdir(VIDEO_DIRNAME)
        for vf in video_filenames:
            if videoid.lower() in vf:
                video_exists = True
                break

    # Download the video if it does not exist
    if not video_exists:
        os.system('youtube-dl {} -o {}'.format('https://youtu.be/{}'.format(videoid), os.path.join(VIDEO_DIRNAME, videoid.lower())))

    # Create a GIF using FFMPEG
    vertical_res = 640
    fps = 24
    video_path = ''
    for vf in os.listdir(VIDEO_DIRNAME):
        if videoid.lower() in vf:
            video_path = os.path.join(VIDEO_DIRNAME, vf)
    pallete_fname = '{}_{}_{}.png'.format(videoid.lower(), start, duration)
    pallete_path = os.path.join(TMP_DIRNAME, pallete_fname)
    os.system('ffmpeg -y -ss {} -t {} -i {} -vf fps={},scale={}:-1:flags=lanczos,palettegen {}'.format(
        start, duration, video_path, fps, vertical_res, pallete_path
    ))
    init_gif_fname = '{}_{}_{}.gif'.format(videoid.lower(), start, duration)
    init_gif_path = os.path.join(TMP_DIRNAME, init_gif_fname)
    os.system('ffmpeg -y -ss {} -t {} -i {} -i {} -filter_complex "fps={}, scale={}:-1:flags=lanczos[x];[x][1:v]paletteuse" {}'.format(
        start, duration, video_path, pallete_path, fps, vertical_res, init_gif_path
    ))

    final_gif_name = '{}_{}_{}.gif'.format(videoid.lower(), start, duration)
    final_gif_path = os.path.join(GIF_DIRNAME, final_gif_name)
    make_captioned_gif(init_gif_path, final_gif_path, fps, caption, font, color)

    return final_gif_name

if __name__ == '__main__':
    fontpath = 'Futura.ttc'
    font = ImageFont.truetype(fontpath, 24)
    #create_gif_from_youtube('IuS5huqOND4', 116, 3.2, "I wouldn't say that at all.", font, (255, 255, 255))
    #create_gif_from_youtube('sjVqDg32_8s', 106, 1, "", font, (255, 255, 255))
    create_gif_from_youtube('sjVqDg32_8s', 84.08, 2, "There is beauty in what we are.", font, (255, 255, 255))
