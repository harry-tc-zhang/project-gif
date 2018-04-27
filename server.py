from flask import Flask, request, send_from_directory, send_file, render_template
from gifmaker import create_gif_from_youtube
from PIL import ImageFont
import os
app = Flask(__name__)


font = ImageFont.truetype(os.path.join('fonts', 'Futura.ttc'), 24)
color = (255, 255, 255)


@app.route('/')
def index():
    context = {
        'api_key': os.environ['PROJECT_GIF_API_KEY']
    }
    return render_template('home.html', ctx=context)


@app.route('/makegif', methods=['POST'])
def makegif():
    #print(request.form)
    try:
        video_id = request.form['videoId']
        start = float(request.form['start'])
        duration = float(request.form['duration'])
        caption = request.form.get('caption', '')
        gif_name = create_gif_from_youtube(video_id, start, duration, caption, font, color)
        return gif_name
    except:
        return "Doesn't look like anything to me."


@app.route('/downloadgif/<gifname>', methods=['GET'])
def downloadgif(gifname):
    print(gifname)
    return send_from_directory('gifs', gifname)


@app.route('/static/<path:staticpath>', methods=['GET'])
def send_static(staticpath):
    return send_from_directory('static', staticpath)


if __name__ == '__main__':
    app.run()
