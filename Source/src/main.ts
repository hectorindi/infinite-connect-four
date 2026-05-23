import  {GameModel}  from './models/GameModel.js';
import  {GameView}  from './views/GameView.js';
import  {GameController}  from './controllers/GameController.js'; 

async function bootstrap() {
    const model = new GameModel();
    const view = new GameView();
    await view.initPixi();
    
    const controller = new GameController(model, view);
    controller.init();
}

bootstrap();