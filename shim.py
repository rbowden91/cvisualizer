import sys
import json

from centipyde.centipyde import interpret

class Unbuffered(object):
   def __init__(self, stream):
       self.stream = stream
   def write(self, data):
       self.stream.write(data)
       self.stream.flush()
   def writelines(self, datas):
       self.stream.writelines(datas)
       self.stream.flush()
   def __getattr__(self, attr):
       return getattr(self.stream, attr)

# unsure if this is necessary
sys.stdout = Unbuffered(sys.stdout)

code = sys.stdin.readline()
code = json.loads(code)
assert 'code' in code
code = code['code']
interpreter = interpret.init_interpreter(code, True)
interpreter.setup_main(code.argv, code.stdin)
response = json.dumps({'success': True, 'status': 'interpreter loaded code'})
print(response + "\n\n")

for line in sys.stdin:
    cmd = json.loads(line)
    if cmd['cmd'] == 'next':
        output = interpreter.step()
        if output is None:
            ret = interpreter.k.get_passthrough(0)
            json.dumps({'success': True, 'returncode': ret.value})
        json.dumps({'success': True, 'output': output})
