import  {GameModel}  from './models/GameModel';
import  {GameView}  from './views/GameView';
import  {GameController}  from './controllers/GameController'; 

async function bootstrap() {
    const model = new GameModel();
    const view = new GameView();
    await view.initPixi();
    
    const controller = new GameController(model, view);
    controller.init();
}

bootstrap();