import sys
import json
import time

from pycparser import c_ast # type:ignore
from centipyde.preprocess import parse_ast
from centipyde.c_runtime import CRuntime

from get_coordinates import get_coordinates

def process(args):
    if isinstance(args, dict):
        for i in args:
            args[i] = process(args[i])
    if isinstance(args, (tuple, list)):
        args = list(args)
        for i in range(len(args)):
            args[i] = process(args[i])
    elif isinstance(args, (bytearray, bytes)):
        # can't just decode the string, because it goes wrong if they screwed up their strings
        args = list(args)
    elif isinstance(args, Val):
        args = args.to_dict()
        args['value'] = process(args['value'])
    elif isinstance(args, (Address, Flow)):
        args = args.to_dict()
    elif isinstance(args, Memory):
        args = args.to_dict()
        args['array'] = process(args['array'])
    return args

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

# TODO: unsure if this is necessary
sys.stdout = Unbuffered(sys.stdout) # type:ignore

json_in = sys.stdin.readline()
code = json.loads(json_in)
assert 'code' in code

ast = parse_ast(code['code'], True)
crt = CRuntime(ast)


coords = get_coordinates(ast)
#interpreter.ast.show(showcoord=True)
crt.setup_main(code['argv'], code['stdin'])
response = json.dumps({'success': True, 'type': 'load code'})
# TODO: need to add newlines, and then make sure that the server waits for newlines, to make sure full message is
# received??
print(response + '\n\n')

for line in sys.stdin:
    cmd = json.loads(line)
    recent_node = None
    while True:
        output = crt.interpreter.step()
        if isinstance(output, c_ast.Node):
            # TODO: just use get_coordinates to tag stmt-level things
            if cmd['cmd'] in ['next', 'play'] and isinstance(output, (c_ast.Decl, c_ast.For, c_ast.Assignment,
                c_ast.UnaryOp, c_ast.FuncCall, c_ast.If, c_ast.Return)) or cmd['cmd'] == 'step':
                    output = {
                        'type': 'node_visit',
                        'args': {
                            'node': output.__class__.__name__,
                            'coords': coords[output]
                        }
                    }
            else: continue
        elif output is None:
            ret = crt.interpreter.k.get_passthrough(0)
            output = {
                'type': 'exit',
                'args': { 'code': ret.value if ret.value is not None else 0, 'stdout': crt.filesystem['<con>'].log }
            }
            print(json.dumps({'type': 'cmd', 'success': True, 'output': output}))
            break
        else:
            output = {
                'type': output[0],
                'args': process(output[1:])
            }
        #print(json.dumps({'type': 'cmd', 'success': True, 'output': recent_node}))
        print(json.dumps({'type': 'cmd', 'success': True, 'output': output}) + '\n\n')
        if cmd['cmd'] not in ['finish', 'play']:
            break
        if cmd['cmd'] == 'play':
            time.sleep(.4)
